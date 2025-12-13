---
summary: "Top-level overview of Clawdis, features, and purpose"
read_when:
  - Introducing Clawdis to newcomers
---
<!-- {% raw %} -->
# CLAWDIS 🦞

> *"EXFOLIATE! EXFOLIATE!"* — A space lobster, probably

<p align="center">
  <img src="whatsapp-clawd.jpg" alt="CLAWDIS" width="420">
</p>

<p align="center">
  <strong>WhatsApp + Telegram gateway for AI agents (Pi).</strong><br>
  Send a message, get an agent response — from your pocket.
</p>

<p align="center">
  <a href="https://github.com/steipete/clawdis">GitHub</a> ·
  <a href="https://www.npmjs.com/package/clawdis">npm</a> ·
  <a href="./clawd.md">Clawd setup</a>
</p>

CLAWDIS bridges WhatsApp (via WhatsApp Web / Baileys) and Telegram (Bot API / grammY) to coding agents like [Pi](https://github.com/badlogic/pi-mono).
It’s built for [Clawd](https://clawd.me), a space lobster who needed a TARDIS.

## How it works

```
┌─────────────┐      ┌──────────┐      ┌─────────────┐
│  WhatsApp   │ ───▶ │ CLAWDIS  │ ───▶ │  AI Agent   │
│  Telegram   │ ───▶ │  🦞⏱️💙   │ ◀─── │    (Pi)     │
│  (You)      │ ◀─── │          │      │             │
└─────────────┘      └──────────┘      └─────────────┘
```

Most operations flow through the **Gateway** (`clawdis gateway`), a single long-running process that owns provider connections and the WebSocket control plane.

## Features (high level)

- 📱 **WhatsApp Integration** — Uses Baileys for WhatsApp Web protocol
- ✈️ **Telegram Bot** — DMs + groups via grammY
- 🤖 **Agent bridge** — Pi (RPC mode) with tool streaming
- 💬 **Sessions** — Per-sender (or shared `main`) conversation context
- 👥 **Group Chat Support** — Mention-based triggering in group chats
- 📎 **Media Support** — Send and receive images, audio, documents
- 🎤 **Voice notes** — Optional transcription hook
- 🖥️ **WebChat + macOS app** — A local UI + menu bar companion for ops and voice wake

Note: legacy Claude/Codex/Gemini/Opencode paths have been removed; Pi is the only coding-agent path.

## Quick start

Runtime requirement: **Node ≥ 22**.

```bash
# Install
npm install -g clawdis

# Pair WhatsApp Web (shows QR)
clawdis login

# Run the Gateway (leave running)
clawdis gateway --port 18789

# Open the local WebChat UI
clawdis webchat
```

Send a test message (requires a running Gateway):

```bash
clawdis send --to +15555550123 --message "Hello from CLAWDIS"
```

## Configuration (optional)

Config lives at `~/.clawdis/clawdis.json`.

- If you **do nothing**, CLAWDIS uses the bundled Pi binary in RPC mode with per-sender sessions.
- If you want to lock it down, start with `inbound.allowFrom` and (for groups) mention rules.

Example:

```json5
{
  inbound: {
    allowFrom: ["+15555550123"],
    groupChat: { requireMention: true, mentionPatterns: ["@clawd"] }
  }
}
```

## Docs

- [Configuration](./configuration.md)
- [Gateway runbook](./gateway.md)
- [WebChat](./webchat.md)
- [Agent integration](./agents.md)
- [Telegram](./telegram.md)
- [Group messages](./group-messages.md)
- [Media: images](./images.md)
- [Media: audio](./audio.md)
- [Sessions](./session.md)
- [Cron + wakeups](./cron.md)
- [Security](./security.md)
- [Troubleshooting](./troubleshooting.md)

## The name

**CLAWDIS = CLAW + TARDIS** — because every space lobster needs a time-and-space machine.

---

*"We're all just playing with our own prompts."* — an AI, probably high on tokens
<!-- {% endraw %} -->

## Credits

- **Peter Steinberger** ([@steipete](https://twitter.com/steipete)) — Creator, lobster whisperer
- **Mario Zechner** ([@badlogicc](https://twitter.com/badlogicgames)) — Pi creator, security pen-tester
- **Clawd** — The space lobster who demanded a better name

## License

MIT — Free as a lobster in the ocean 🦞

---

*"We're all just playing with our own prompts."* — An AI, probably high on tokens
