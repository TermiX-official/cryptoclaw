import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import { loadConfig } from "../config/config.js";
import {
  loadSessionStore,
  resolveStorePath,
  type SessionEntry,
} from "../config/sessions.js";
import { danger, info } from "../globals.js";
import { logDebug } from "../logger.js";
import { runCommandWithTimeout } from "../process/exec.js";

const WEBCHAT_DEFAULT_PORT = 18788;

type WebChatServerState = {
  server: http.Server;
  port: number;
};

let state: WebChatServerState | null = null;

function resolveWebRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url));

  // 1) Packaged app: resources live next to the relay bundle at
  //    Contents/Resources/WebChat. The relay binary runs from
  //    Contents/Resources/Relay/bun, so walk up one and check.
  const packagedRoot = path.resolve(path.dirname(process.execPath), "../WebChat");
  if (fs.existsSync(packagedRoot)) return packagedRoot;

  // 2) Dev / source checkout: repo-relative path.
  return path.resolve(here, "../../apps/macos/Sources/Clawdis/Resources/WebChat");
}

function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req
      .on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", reject);
  });
}

function pickSessionId(sessionKey: string, store: Record<string, SessionEntry>): string | null {
  if (store[sessionKey]?.sessionId) return store[sessionKey].sessionId;
  const first = Object.values(store)[0]?.sessionId;
  return first ?? null;
}

function readSessionMessages(sessionId: string, storePath: string): any[] {
  const dir = path.dirname(storePath);
  const candidates = [path.join(dir, `${sessionId}.jsonl`), path.join(os.homedir(), ".tau/agent/sessions/clawdis", `${sessionId}.jsonl`)];
  let content: string | null = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        content = fs.readFileSync(p, "utf-8");
        break;
      } catch {
        // continue
      }
    }
  }
  if (!content) return [];

  const messages: any[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const msg = obj.message ?? obj;
      if (!msg?.role || !msg?.content) continue;
      messages.push({ role: msg.role, content: msg.content });
    } catch (err) {
      logDebug(`webchat history parse error: ${String(err)}`);
    }
  }
  return messages;
}

async function handleRpc(body: any, sessionKey: string): Promise<{ ok: boolean; payloads?: any[]; error?: string }> {
  const text: string = (body?.text ?? "").toString();
  if (!text.trim()) return { ok: false, error: "empty text" };

  const cfg = loadConfig();
  const replyCfg = cfg.inbound?.reply;
  if (!replyCfg || replyCfg.mode !== "command") {
    return { ok: false, error: "agent command mode not configured" };
  }

  const storePath = replyCfg.session?.store
    ? resolveStorePath(replyCfg.session.store)
    : resolveStorePath(undefined);
  const store = loadSessionStore(storePath);
  const sessionId = pickSessionId(sessionKey, store) ?? crypto.randomUUID();

  const cmd = ["clawdis", "agent", "--message", text, "--json", "--session-id", sessionId];
  if (body?.thinking) cmd.push("--thinking", String(body.thinking));
  if (body?.deliver) cmd.push("--deliver");
  if (body?.to) cmd.push("--to", String(body.to));

  try {
    const { stdout, stderr, code } = await runCommandWithTimeout(cmd, {
      timeoutMs: 120_000,
      cwd: path.dirname(storePath),
    });
    if (code !== 0) {
      return { ok: false, error: stderr.trim() || `agent exited ${code}` };
    }
    const parsed = JSON.parse(stdout || "{}");
    return { ok: true, payloads: parsed.payloads ?? [] };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function notFound(res: http.ServerResponse) {
  res.statusCode = 404;
  res.end("Not Found");
}

export async function startWebChatServer(port = WEBCHAT_DEFAULT_PORT) {
  if (state) return state;

  const root = resolveWebRoot();
  const server = http.createServer(async (req, res) => {
    if (!req.url) return notFound(res);
    // enforce loopback only
    if (req.socket.remoteAddress && !req.socket.remoteAddress.startsWith("127.")) {
      res.statusCode = 403;
      res.end("loopback only");
      return;
    }

    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/webchat/info") {
      const sessionKey = url.searchParams.get("session") ?? "main";
      const cfg = loadConfig();
      const sessionCfg = cfg.inbound?.reply?.session;
      const storePath = sessionCfg?.store
        ? resolveStorePath(sessionCfg.store)
        : resolveStorePath(undefined);
      const store = loadSessionStore(storePath);
      const sessionId = pickSessionId(sessionKey, store);
      const messages = sessionId ? readSessionMessages(sessionId, storePath) : [];
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          port,
          sessionKey,
          storePath,
          sessionId,
          initialMessages: messages,
          basePath: "/webchat/",
        }),
      );
      return;
    }

    if (url.pathname === "/webchat/rpc" && req.method === "POST") {
      const bodyBuf = await readBody(req);
      let body: any = {};
      try {
        body = JSON.parse(bodyBuf.toString("utf-8"));
      } catch {
        // ignore
      }
      const sessionKey = body.session || "main";
      const result = await handleRpc(body, sessionKey);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
      return;
    }

    if (url.pathname.startsWith("/webchat")) {
      let rel = url.pathname.replace(/^\/webchat\/?/, "");
      if (!rel || rel.endsWith("/")) rel = rel + "index.html";
      const filePath = path.join(root, rel);
      if (!filePath.startsWith(root)) return notFound(res);
      if (!fs.existsSync(filePath)) return notFound(res);
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const type =
        ext === ".html"
          ? "text/html"
          : ext === ".js"
            ? "application/javascript"
            : ext === ".css"
              ? "text/css"
              : "application/octet-stream";
      res.setHeader("Content-Type", type);
      res.end(data);
      return;
    }

    notFound(res);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  state = { server, port };
  logDebug(info(`webchat server listening on 127.0.0.1:${port}`));
  return state;
}

export async function ensureWebChatServerFromConfig() {
  const cfg = loadConfig();
  if (cfg.webchat?.enabled === false) return null;
  const port = cfg.webchat?.port ?? WEBCHAT_DEFAULT_PORT;
  try {
    return await startWebChatServer(port);
  } catch (err) {
    logDebug(`webchat server failed to start: ${String(err)}`);
    throw err;
  }
}

export function getWebChatServer(): WebChatServerState | null {
  return state;
}

export async function stopWebChatServer() {
  if (!state) return;
  await new Promise<void>((resolve) => state?.server.close(() => resolve()));
  state = null;
}
