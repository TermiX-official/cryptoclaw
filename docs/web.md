---
summary: "Gateway web surfaces: Control UI, bind modes, and security"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
---
# Web (Gateway)

The Gateway serves a small **browser Control UI** (Vite + Lit) from the same port as the Gateway WebSocket:

- `http://<host>:18789/ui/`

The UI talks directly to the Gateway WS and supports:
- Chat (`chat.history`, `chat.send`, `chat.abort`)
- Nodes (`node.list`, `node.describe`, `node.invoke`)
- Config (`config.get`, `config.set`) for `~/.clawdis/clawdis.json`

## Config (default-on)

The Control UI is **enabled by default** when assets are present (`dist/control-ui`).
You can control it via config:

```json5
{
  gateway: {
    controlUi: { enabled: true } // set false to disable /ui/
  }
}
```

## Tailnet access

To access the UI across Tailscale, bind the Gateway to the Tailnet interface and require a token.

### Via config (recommended)

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true }
  }
}
```

Then start the gateway (token required for non-loopback binds):

```bash
export CLAWDIS_GATEWAY_TOKEN="…your token…"
clawdis gateway
```

Open:
- `http://<tailscale-ip>:18789/ui/`

### Via CLI (one-off)

```bash
clawdis gateway --bind tailnet --token "…your token…"
```

## Security notes

- Binding the Gateway to a non-loopback address **requires** `CLAWDIS_GATEWAY_TOKEN`.
- The token is sent as `connect.params.auth.token` by the UI and other clients.

## Building the UI

The Gateway serves static files from `dist/control-ui`. Build them with:

```bash
pnpm ui:install
pnpm ui:build
```

