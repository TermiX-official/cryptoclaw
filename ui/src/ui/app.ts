import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { GatewayBrowserClient, type GatewayEventFrame } from "./gateway";
import { loadSettings, saveSettings, type UiSettings } from "./storage";

type Tab = "chat" | "nodes" | "config";

@customElement("clawdis-app")
export class ClawdisApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    .shell {
      height: 100%;
      display: grid;
      grid-template-rows: auto 1fr;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.18);
      backdrop-filter: blur(14px);
    }
    nav {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .tab {
      border: 1px solid transparent;
      padding: 7px 10px;
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
      color: var(--muted);
    }
    .tab.active {
      color: var(--text);
      border-color: rgba(255, 69, 0, 0.35);
      background: rgba(255, 69, 0, 0.12);
    }
    main {
      padding: 16px;
      max-width: 1120px;
      width: 100%;
      margin: 0 auto;
    }
    .grid {
      display: grid;
      gap: 14px;
    }
    .card {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 16px;
      padding: 12px;
    }
    .statusDot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--danger);
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
    }
    .statusDot.ok {
      background: var(--ok);
    }
    .title {
      font-weight: 650;
      letter-spacing: 0.2px;
    }
    .split {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 14px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .split {
        grid-template-columns: 1fr;
      }
    }
    .messages {
      display: grid;
      gap: 10px;
      max-height: 60vh;
      overflow: auto;
      padding: 8px;
    }
    .msg {
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.2);
      border-radius: 14px;
      padding: 10px 12px;
    }
    .msg .meta {
      font-size: 12px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }
    .msg.user {
      border-color: rgba(255, 255, 255, 0.14);
    }
    .msg.assistant {
      border-color: rgba(255, 69, 0, 0.25);
      background: rgba(255, 69, 0, 0.08);
    }
    .compose {
      display: grid;
      gap: 10px;
    }
    .compose textarea {
      min-height: 92px;
      font-family: var(--mono);
    }
    .nodes {
      display: grid;
      gap: 10px;
    }
    .nodeRow {
      display: grid;
      gap: 6px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.18);
    }
    .nodeRow .top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      font-size: 12px;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 8px;
      color: var(--muted);
      background: rgba(0, 0, 0, 0.18);
    }
    .error {
      color: var(--danger);
      font-family: var(--mono);
      white-space: pre-wrap;
    }
  `;

  @state() private settings: UiSettings = loadSettings();
  @state() private tab: Tab = "chat";
  @state() private connected = false;
  @state() private hello: unknown = null;
  @state() private lastError: string | null = null;

  @state() private sessionKey = this.settings.sessionKey;
  @state() private chatLoading = false;
  @state() private chatSending = false;
  @state() private chatMessage = "";
  @state() private chatMessages: unknown[] = [];
  @state() private chatStream: string | null = null;
  @state() private chatRunId: string | null = null;

  @state() private nodesLoading = false;
  @state() private nodes: Array<Record<string, unknown>> = [];

  @state() private configLoading = false;
  @state() private configRaw = "{\n}\n";
  @state() private configValid: boolean | null = null;
  @state() private configIssues: unknown[] = [];
  @state() private configSaving = false;

  private client: GatewayBrowserClient | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.connect();
  }

  private connect() {
    this.lastError = null;
    this.hello = null;
    this.connected = false;

    this.client?.stop();
    this.client = new GatewayBrowserClient({
      url: this.settings.gatewayUrl,
      token: this.settings.token.trim() ? this.settings.token : undefined,
      clientName: "clawdis-control-ui",
      mode: "webchat",
      onHello: (hello) => {
        this.connected = true;
        this.hello = hello;
        void this.refreshActiveTab();
      },
      onClose: ({ code, reason }) => {
        this.connected = false;
        this.lastError = `disconnected (${code}): ${reason || "no reason"}`;
      },
      onEvent: (evt) => this.onEvent(evt),
      onGap: ({ expected, received }) => {
        this.lastError = `event gap detected (expected seq ${expected}, got ${received}); refresh recommended`;
      },
    });
    this.client.start();
  }

  private onEvent(evt: GatewayEventFrame) {
    if (evt.event === "chat") {
      const payload = evt.payload as
        | {
            runId: string;
            sessionKey: string;
            state: "delta" | "final" | "aborted" | "error";
            message?: unknown;
            errorMessage?: string;
          }
        | undefined;
      if (!payload) return;
      if (payload.sessionKey !== this.sessionKey) return;
      if (payload.runId && this.chatRunId && payload.runId !== this.chatRunId)
        return;

      if (payload.state === "delta") {
        this.chatStream = extractText(payload.message) ?? this.chatStream;
      } else if (payload.state === "final") {
        this.chatStream = null;
        this.chatRunId = null;
        void this.loadChatHistory();
      } else if (payload.state === "error") {
        this.chatStream = null;
        this.chatRunId = null;
        this.lastError = payload.errorMessage ?? "chat error";
      }
    }
  }

  private async refreshActiveTab() {
    if (this.tab === "chat") await this.loadChatHistory();
    if (this.tab === "nodes") await this.loadNodes();
    if (this.tab === "config") await this.loadConfig();
  }

  private async loadChatHistory() {
    if (!this.client || !this.connected) return;
    this.chatLoading = true;
    this.lastError = null;
    try {
      const res = (await this.client.request("chat.history", {
        sessionKey: this.sessionKey,
        limit: 200,
      })) as { messages?: unknown[] };
      this.chatMessages = Array.isArray(res.messages) ? res.messages : [];
    } catch (err) {
      this.lastError = String(err);
    } finally {
      this.chatLoading = false;
    }
  }

  private async sendChat() {
    if (!this.client || !this.connected) return;
    const msg = this.chatMessage.trim();
    if (!msg) return;

    this.chatSending = true;
    this.lastError = null;
    const runId = crypto.randomUUID();
    this.chatRunId = runId;
    this.chatStream = "";
    try {
      await this.client.request("chat.send", {
        sessionKey: this.sessionKey,
        message: msg,
        deliver: false,
        idempotencyKey: runId,
      });
      this.chatMessage = "";
      // Final chat state will refresh history, but do an eager refresh in case
      // the run completed without emitting a chat event (older gateways).
      void this.loadChatHistory();
    } catch (err) {
      this.chatRunId = null;
      this.chatStream = null;
      this.lastError = String(err);
    } finally {
      this.chatSending = false;
    }
  }

  private async loadNodes() {
    if (!this.client || !this.connected) return;
    this.nodesLoading = true;
    this.lastError = null;
    try {
      const res = (await this.client.request("node.list", {})) as {
        nodes?: Array<Record<string, unknown>>;
      };
      this.nodes = Array.isArray(res.nodes) ? res.nodes : [];
    } catch (err) {
      this.lastError = String(err);
    } finally {
      this.nodesLoading = false;
    }
  }

  private async loadConfig() {
    if (!this.client || !this.connected) return;
    this.configLoading = true;
    this.lastError = null;
    try {
      const res = (await this.client.request("config.get", {})) as {
        raw?: string | null;
        valid?: boolean;
        issues?: unknown[];
        config?: unknown;
      };
      if (typeof res.raw === "string") {
        this.configRaw = res.raw;
      } else {
        const cfg = res.config ?? {};
        this.configRaw = `${JSON.stringify(cfg, null, 2).trimEnd()}\n`;
      }
      this.configValid = typeof res.valid === "boolean" ? res.valid : null;
      this.configIssues = Array.isArray(res.issues) ? res.issues : [];
    } catch (err) {
      this.lastError = String(err);
    } finally {
      this.configLoading = false;
    }
  }

  private async saveConfig() {
    if (!this.client || !this.connected) return;
    this.configSaving = true;
    this.lastError = null;
    try {
      await this.client.request("config.set", { raw: this.configRaw });
      await this.loadConfig();
    } catch (err) {
      this.lastError = String(err);
    } finally {
      this.configSaving = false;
    }
  }

  private setTab(next: Tab) {
    this.tab = next;
    void this.refreshActiveTab();
  }

  private applySettings(next: UiSettings) {
    this.settings = next;
    saveSettings(next);
  }

  render() {
    const proto = this.settings.gatewayUrl.startsWith("wss://") ? "wss" : "ws";
    const connectedBadge = html`
      <span class="pill" title=${this.connected ? "connected" : "disconnected"}>
        <span class="statusDot ${this.connected ? "ok" : ""}"></span>
        <span class="mono">${proto}</span>
        <span class="mono">${this.settings.gatewayUrl}</span>
      </span>
    `;

    return html`
      <div class="shell">
        <header>
          <div class="row">
            <div class="title">Clawdis Control</div>
            ${connectedBadge}
          </div>
          <nav>
            ${this.renderTabs()}
          </nav>
        </header>
        <main>
          <div class="grid">
            ${this.renderSettingsCard()} ${this.renderActiveTab()}
            ${this.lastError
              ? html`<div class="card"><div class="error">${this.lastError}</div></div>`
              : nothing}
          </div>
        </main>
      </div>
    `;
  }

  private renderTabs() {
    const tab = (id: Tab, label: string) => html`
      <div
        class="tab ${this.tab === id ? "active" : ""}"
        @click=${() => this.setTab(id)}
      >
        ${label}
      </div>
    `;
    return html`${tab("chat", "Chat")} ${tab("nodes", "Nodes")}
    ${tab("config", "Config")}`;
  }

  private renderSettingsCard() {
    return html`
      <div class="card">
        <div class="split">
          <div class="field">
            <label>Gateway WebSocket URL</label>
            <input
              .value=${this.settings.gatewayUrl}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                this.applySettings({ ...this.settings, gatewayUrl: v });
              }}
              placeholder="ws://100.x.y.z:18789"
            />
          </div>
          <div class="field">
            <label>Gateway Token (CLAWDIS_GATEWAY_TOKEN)</label>
            <input
              .value=${this.settings.token}
              @input=${(e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                this.applySettings({ ...this.settings, token: v });
              }}
              placeholder="paste token"
            />
          </div>
        </div>
        <div class="row" style="justify-content: space-between; margin-top: 10px;">
          <div class="muted">
            Tip: for Tailnet access, start the gateway with a token and bind to
            the Tailnet interface.
          </div>
          <div class="row">
            <button class="btn" @click=${() => this.connect()}>
              Reconnect
            </button>
            <button class="btn danger" @click=${() => this.client?.stop()}>
              Disconnect
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderActiveTab() {
    if (this.tab === "chat") return this.renderChat();
    if (this.tab === "nodes") return this.renderNodes();
    if (this.tab === "config") return this.renderConfig();
    return nothing;
  }

  private renderChat() {
    return html`
      <div class="card">
        <div class="row" style="justify-content: space-between;">
          <div class="row">
            <div class="field" style="min-width: 220px;">
              <label>Session Key</label>
              <input
                .value=${this.sessionKey}
                @input=${(e: Event) => {
                  const v = (e.target as HTMLInputElement).value;
                  this.sessionKey = v;
                  this.applySettings({ ...this.settings, sessionKey: v });
                }}
              />
            </div>
            <button
              class="btn"
              ?disabled=${this.chatLoading || !this.connected}
              @click=${() => this.loadChatHistory()}
            >
              ${this.chatLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
          <div class="muted">Messages come from the session JSONL logs.</div>
        </div>

        <div class="messages" style="margin-top: 12px;">
          ${this.chatMessages.map((m) => renderMessage(m))}
          ${this.chatStream
            ? html`${renderMessage({
                role: "assistant",
                content: [{ type: "text", text: this.chatStream }],
              })}`
            : nothing}
        </div>

        <div class="compose" style="margin-top: 12px;">
          <div class="field">
            <label>Message</label>
            <textarea
              .value=${this.chatMessage}
              @input=${(e: Event) => {
                this.chatMessage = (e.target as HTMLTextAreaElement).value;
              }}
              placeholder="Ask the model…"
            ></textarea>
          </div>
          <div class="row" style="justify-content: flex-end;">
            <button
              class="btn primary"
              ?disabled=${this.chatSending || !this.connected}
              @click=${() => this.sendChat()}
            >
              ${this.chatSending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderNodes() {
    return html`
      <div class="card">
        <div class="row" style="justify-content: space-between;">
          <div class="title">Nodes</div>
          <button
            class="btn"
            ?disabled=${this.nodesLoading || !this.connected}
            @click=${() => this.loadNodes()}
          >
            ${this.nodesLoading ? "Loading…" : "Refresh"}
          </button>
        </div>
        <div class="nodes" style="margin-top: 12px;">
          ${this.nodes.length === 0
            ? html`<div class="muted">No nodes found.</div>`
            : this.nodes.map((n) => renderNode(n))}
        </div>
      </div>
    `;
  }

  private renderConfig() {
    const validity =
      this.configValid === null
        ? "unknown"
        : this.configValid
          ? "valid"
          : "invalid";
    return html`
      <div class="card">
        <div class="row" style="justify-content: space-between;">
          <div class="row">
            <div class="title">Config</div>
            <span class="pill"><span class="mono">${validity}</span></span>
          </div>
          <div class="row">
            <button
              class="btn"
              ?disabled=${this.configLoading || !this.connected}
              @click=${() => this.loadConfig()}
            >
              ${this.configLoading ? "Loading…" : "Reload"}
            </button>
            <button
              class="btn primary"
              ?disabled=${this.configSaving || !this.connected}
              @click=${() => this.saveConfig()}
            >
              ${this.configSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div class="muted" style="margin-top: 10px;">
          Writes to <span class="mono">~/.clawdis/clawdis.json</span>. Some
          changes may require a gateway restart.
        </div>

        <div class="field" style="margin-top: 12px;">
          <label>Raw JSON5</label>
          <textarea
            .value=${this.configRaw}
            @input=${(e: Event) => {
              this.configRaw = (e.target as HTMLTextAreaElement).value;
            }}
          ></textarea>
        </div>

        ${this.configIssues.length > 0
          ? html`<div class="card" style="margin-top: 12px;">
              <div class="title">Issues</div>
              <div class="error">${JSON.stringify(this.configIssues, null, 2)}</div>
            </div>`
          : nothing}
      </div>
    `;
  }
}

function renderNode(node: Record<string, unknown>) {
  const connected = Boolean(node.connected);
  const paired = Boolean(node.paired);
  const title =
    (typeof node.displayName === "string" && node.displayName.trim()) ||
    (typeof node.nodeId === "string" ? node.nodeId : "unknown");
  const caps = Array.isArray(node.caps) ? (node.caps as unknown[]) : [];
  const commands = Array.isArray(node.commands) ? (node.commands as unknown[]) : [];
  return html`
    <div class="nodeRow">
      <div class="top">
        <div class="row">
          <span class="statusDot ${connected ? "ok" : ""}"></span>
          <div class="title">${title}</div>
        </div>
        <div class="row muted">
          <span>${paired ? "paired" : "unpaired"}</span>
          <span>·</span>
          <span>${connected ? "connected" : "offline"}</span>
        </div>
      </div>
      <div class="muted mono">
        ${typeof node.nodeId === "string" ? node.nodeId : ""}
        ${typeof node.remoteIp === "string" ? `· ${node.remoteIp}` : ""}
        ${typeof node.version === "string" ? `· ${node.version}` : ""}
      </div>
      ${caps.length > 0
        ? html`<div class="chips">
            ${caps.slice(0, 24).map((c) => html`<span class="chip">${String(c)}</span>`)}
          </div>`
        : nothing}
      ${commands.length > 0
        ? html`<div class="chips">
            ${commands
              .slice(0, 24)
              .map((c) => html`<span class="chip">${String(c)}</span>`)}
          </div>`
        : nothing}
    </div>
  `;
}

function renderMessage(message: unknown) {
  const m = message as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role : "unknown";
  const text =
    extractText(message) ??
    (typeof m.content === "string"
      ? m.content
      : JSON.stringify(message, null, 2));

  const ts =
    typeof m.timestamp === "number"
      ? new Date(m.timestamp).toLocaleTimeString()
      : "";
  const klass =
    role === "assistant" ? "assistant" : role === "user" ? "user" : "";
  return html`
    <div class="msg ${klass}">
      <div class="meta">
        <span class="mono">${role}</span>
        <span class="mono">${ts}</span>
      </div>
      <div style="white-space: pre-wrap;">${text}</div>
    </div>
  `;
}

function extractText(message: unknown): string | null {
  const m = message as Record<string, unknown>;
  const content = m.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = content
      .map((p) => {
        const item = p as Record<string, unknown>;
        if (item.type === "text" && typeof item.text === "string") return item.text;
        return null;
      })
      .filter((v): v is string => typeof v === "string");
    if (parts.length > 0) return parts.join("\n");
  }
  if (typeof m.text === "string") return m.text;
  return null;
}

