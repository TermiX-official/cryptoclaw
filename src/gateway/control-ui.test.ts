import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { handleControlUiHttpRequest } from "./control-ui.js";

const makeResponse = (): {
  res: ServerResponse;
  setHeader: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
} => {
  const setHeader = vi.fn();
  const end = vi.fn();
  const res = {
    headersSent: false,
    statusCode: 200,
    setHeader,
    end,
  } as unknown as ServerResponse;
  return { res, setHeader, end };
};

describe("handleControlUiHttpRequest", () => {
  it("sets anti-clickjacking headers for Control UI responses", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-ui-"));
    try {
      await fs.writeFile(path.join(tmp, "index.html"), "<html></html>\n");
      const { res, setHeader } = makeResponse();
      const handled = handleControlUiHttpRequest(
        { url: "/", method: "GET" } as IncomingMessage,
        res,
        {
          root: { kind: "resolved", path: tmp },
        },
      );
      expect(handled).toBe(true);
      expect(setHeader).toHaveBeenCalledWith("X-Frame-Options", "DENY");
      expect(setHeader).toHaveBeenCalledWith("Content-Security-Policy", "frame-ancestors 'none'");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("injects gateway token into index.html when config provides one", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-ui-token-"));
    try {
      await fs.writeFile(path.join(tmp, "index.html"), "<html><head></head><body></body></html>\n");
      const { res, end } = makeResponse();
      handleControlUiHttpRequest({ url: "/", method: "GET" } as IncomingMessage, res, {
        root: { kind: "resolved", path: tmp },
        config: { gateway: { auth: { token: "test-secret-42" } } },
      });
      const html = end.mock.calls[0]?.[0]?.toString() ?? "";
      expect(html).toContain('window.__CRYPTOCLAW_GATEWAY_TOKEN__="test-secret-42"');
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("omits gateway token from index.html when config has no token", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-ui-notoken-"));
    try {
      await fs.writeFile(path.join(tmp, "index.html"), "<html><head></head><body></body></html>\n");
      const { res, end } = makeResponse();
      handleControlUiHttpRequest({ url: "/", method: "GET" } as IncomingMessage, res, {
        root: { kind: "resolved", path: tmp },
      });
      const html = end.mock.calls[0]?.[0]?.toString() ?? "";
      expect(html).not.toContain("__CRYPTOCLAW_GATEWAY_TOKEN__");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
