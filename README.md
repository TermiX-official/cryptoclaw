# CryptoClaw — Private Crypto AI Assistant

<p align="center">
  <strong>Wallet management, DeFi, NFTs, and multi-chain operations from your terminal.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@termix-it/cryptoclaw"><img src="https://img.shields.io/npm/v/@termix-it/cryptoclaw?style=for-the-badge" alt="npm version"></a>
  <a href="https://github.com/TermiX-official/cryptoclaw"><img src="https://img.shields.io/github/stars/TermiX-official/cryptoclaw?style=for-the-badge" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

**CryptoClaw** is a private, AI-powered crypto assistant you run on your own devices. It gives your AI agent native access to wallets, DeFi protocols, NFTs, on-chain data, and CEX trading — all through natural language. It connects to the messaging channels you already use (Telegram, WhatsApp, Discord, Slack, Signal, iMessage, and more) and works entirely on your own machine. Your keys stay yours.

If you want a personal, always-on crypto assistant that feels local, fast, and private — this is it.

---

## Official Binance Skills Integration

CryptoClaw is the first AI assistant to ship with the **official [Binance Skills Hub](https://github.com/binance/binance-skills-hub)** — 7 native skills powered directly by Binance's Web3 and CEX infrastructure.

> Special thanks to [@binance](https://github.com/binance) for building and open-sourcing the Binance Skills Hub. 🙌

| Skill                    | What it does                                                                     |
| ------------------------ | -------------------------------------------------------------------------------- |
| `binance-spot`           | CEX spot trading — place/cancel orders, query account, 60+ Binance API endpoints |
| `binance-market-rank`    | Trending tokens, smart money inflow, social hype leaderboard, PnL rankings       |
| `binance-token-info`     | Token search, metadata, real-time market data, K-line candlestick charts         |
| `binance-token-audit`    | Security audit — detect honeypots, rug pulls, and malicious contracts            |
| `binance-trading-signal` | Smart Money on-chain buy/sell signals on BSC & Solana                            |
| `binance-address-info`   | Query any wallet's token holdings and portfolio across BSC, Base, Solana         |
| `binance-meme-rush`      | Real-time meme token launchpad tracking and AI trending narrative discovery      |

Supported chains for Binance Web3 skills: **BSC (56)**, **Base (8453)**, **Solana (CT_501)**, **Ethereum (1)**

---

## What CryptoClaw Can Do

### Crypto Core

- **Wallet management** — create, import, monitor, and sign across EVM and Solana wallets
- **Token swaps** — Uniswap, PancakeSwap, and other DEX protocols across EVM chains
- **DeFi positions** — track yield farming, staking, liquidity pools (Aave, DeFiLlama, DeBank)
- **NFT operations** — query, transfer, and monitor ERC721/ERC1155 collections
- **Contract deployment** — deploy ERC20/ERC721 from templates
- **On-chain data** — Etherscan, Dune Analytics, whale tracking, gas monitoring
- **Security checks** — GoPlus Security API + Binance Token Audit for every token

### Market Intelligence

- **Binance market rankings** — trending, smart money inflow, social hype, Binance Alpha
- **Smart Money signals** — follow professional on-chain buy/sell activity (BSC + Solana)
- **Meme token discovery** — real-time launchpad tracking (Pump.fun, Four.meme, Moonit)
- **CoinGecko & DeFiLlama** — prices, market caps, TVL, protocol analytics
- **Macro calendar** — Fed rates, CPI, economic events impacting crypto
- **Hyperliquid** — perpetual futures and spot trading on Hyperliquid DEX
- **Whale watcher** — monitor large on-chain transactions

### Messaging Channels

Connect CryptoClaw to the channels you already use:

| Channel                | Status    |
| ---------------------- | --------- |
| Telegram               | Supported |
| WhatsApp               | Supported |
| Discord                | Supported |
| Slack                  | Supported |
| Signal                 | Supported |
| iMessage (BlueBubbles) | Supported |
| Microsoft Teams        | Supported |
| Matrix                 | Supported |
| IRC                    | Supported |
| Feishu                 | Supported |
| LINE                   | Supported |
| Mattermost             | Supported |
| Nextcloud Talk         | Supported |
| Nostr                  | Supported |
| Zalo                   | Supported |
| WebChat                | Supported |

---

## Install

**Requirements:** Node.js 22+

```bash
npm install -g @termix-it/cryptoclaw
```

Or with pnpm / bun:

```bash
pnpm add -g @termix-it/cryptoclaw
bun add -g @termix-it/cryptoclaw
```

---

## Quick Start

```bash
# Run the onboarding wizard (recommended)
cryptoclaw onboard

# Start the gateway
cryptoclaw gateway run --port 18789

# Check status of all connected channels
cryptoclaw channels status

# Send a message to any channel
cryptoclaw message send --to @username --message "What is the BTC price?"

# Run the AI agent directly
cryptoclaw agent --message "Show me smart money signals on BSC" --thinking high
```

---

## Supported Chains

| Chain           | Type | Details             |
| --------------- | ---- | ------------------- |
| Ethereum        | EVM  | Mainnet + testnets  |
| BSC (BNB Chain) | EVM  | Binance Smart Chain |
| Base            | EVM  | Coinbase L2         |
| Arbitrum        | EVM  | Arbitrum One        |
| Polygon         | EVM  | PoS chain           |
| Solana          | SVM  | SPL tokens          |
| Hyperliquid     | L1   | Perps + spot        |

---

## Skills Library (80+)

CryptoClaw ships with 80+ skills covering crypto, DeFi, productivity, and automation. Skills are loaded per-conversation and give the AI agent native access to external tools and APIs.

### Crypto & DeFi

| Skill                    | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `binance-spot`           | Binance CEX spot trading — 60+ endpoints           |
| `binance-market-rank`    | Trending tokens, smart money, social hype rankings |
| `binance-token-info`     | Token search, metadata, real-time data, K-lines    |
| `binance-token-audit`    | Security audit for honeypots and rug pulls         |
| `binance-trading-signal` | Smart Money on-chain buy/sell signals              |
| `binance-address-info`   | Wallet portfolio query across chains               |
| `binance-meme-rush`      | Launchpad meme token and trend discovery           |
| `wallet-manager`         | Create, import, and manage blockchain wallets      |
| `token-swap`             | Swap tokens on Uniswap/PancakeSwap                 |
| `coingecko`              | Prices, market caps, charts, trending tokens       |
| `defillama`              | TVL, protocol analytics, yield pools               |
| `debank`                 | Wallet portfolios and DeFi positions               |
| `etherscan`              | Block explorer queries (ETH, BSC, Polygon, etc.)   |
| `hyperliquid`            | Perpetual futures and spot on Hyperliquid DEX      |
| `aave-bsc`               | Aave V3 lending on BSC                             |
| `dune`                   | Custom SQL analytics on Dune                       |
| `gas-tracker`            | Gas prices across networks                         |
| `whale-watcher`          | Large on-chain transaction monitoring              |
| `market-data`            | Multi-source price and market data                 |
| `security-check`         | Token/address security via GoPlus API              |
| `portfolio-tracker`      | Track holdings and portfolio value                 |
| `defi-dashboard`         | Yield farming, staking, liquidity pools            |
| `nft-manager`            | View, transfer, manage NFTs                        |
| `contract-deployer`      | Deploy ERC20/ERC721 from templates                 |
| `four-meme`              | BSC launchpad token discovery                      |
| `macro-calendar`         | Macro events (Fed, CPI, economic calendar)         |
| `agent-identity`         | On-chain AI agent identity (ERC-8004)              |

### Productivity & Automation

| Skill             | Description                                       |
| ----------------- | ------------------------------------------------- |
| `github`          | GitHub issues, PRs, CI runs via `gh` CLI          |
| `gh-issues`       | Auto-implement GitHub issues and open PRs         |
| `notion`          | Notion pages, databases, blocks                   |
| `trello`          | Trello boards, lists, and cards                   |
| `obsidian`        | Obsidian vault management                         |
| `apple-notes`     | Apple Notes via `memo` CLI (macOS)                |
| `apple-reminders` | Apple Reminders via `remindctl`                   |
| `bear-notes`      | Bear notes via `grizzly` CLI                      |
| `things-mac`      | Things 3 task management (macOS)                  |
| `1password`       | 1Password CLI integration                         |
| `gog`             | Google Workspace (Gmail, Calendar, Drive, Sheets) |
| `himalaya`        | Email via IMAP/SMTP                               |
| `slack`           | Slack channel and DM operations                   |
| `discord`         | Discord channel operations                        |
| `tmux`            | Remote tmux session control                       |
| `summarize`       | Summarize URLs, podcasts, and files               |
| `blogwatcher`     | RSS/Atom feed monitoring                          |
| `oracle`          | Prompt bundling and agent orchestration           |

### AI & Media

| Skill                | Description                                     |
| -------------------- | ----------------------------------------------- |
| `coding-agent`       | Delegate coding tasks to Codex/Claude/Pi agents |
| `skill-creator`      | Create and publish new agent skills             |
| `openai-image-gen`   | Batch image generation via OpenAI               |
| `openai-whisper`     | Local speech-to-text (offline)                  |
| `openai-whisper-api` | Transcription via OpenAI Whisper API            |
| `nano-banana-pro`    | Image generation/editing via Gemini             |
| `gemini`             | Gemini CLI for Q&A and generation               |
| `peekaboo`           | macOS UI capture and automation                 |
| `camsnap`            | RTSP/ONVIF camera capture                       |
| `video-frames`       | Frame/clip extraction via ffmpeg                |
| `gifgrep`            | GIF search and download                         |
| `canvas`             | Agent-driven visual workspace                   |
| `session-logs`       | Search and analyze conversation history         |
| `model-usage`        | Per-model cost and usage tracking               |

### Home & Lifestyle

| Skill            | Description                        |
| ---------------- | ---------------------------------- |
| `openhue`        | Philips Hue lights via OpenHue CLI |
| `eightctl`       | Eight Sleep pod control            |
| `sonoscli`       | Sonos speaker control              |
| `spotify-player` | Spotify playback via terminal      |
| `songsee`        | Audio spectrogram visualization    |
| `weather`        | Weather via wttr.in / Open-Meteo   |
| `goplaces`       | Google Places API search           |
| `ordercli`       | Foodora order history              |

### Voice & TTS

| Skill             | Description                           |
| ----------------- | ------------------------------------- |
| `sag`             | ElevenLabs TTS (mac-style `say` UX)   |
| `sherpa-onnx-tts` | Local TTS via sherpa-onnx (offline)   |
| `voice-call`      | Voice calls via the voice-call plugin |

---

## Configuration

```bash
# Set your preferred AI model
cryptoclaw config set model openai/gpt-4o
# or: anthropic/claude-opus-4-6, google/gemini-2.0-flash, etc.

# Add a wallet
cryptoclaw wallet add

# Connect a messaging channel
cryptoclaw channels connect telegram
cryptoclaw channels connect discord
cryptoclaw channels connect whatsapp

# List installed skills
cryptoclaw skills list

# Install a skill
cryptoclaw skills install binance-spot

# Check channel and gateway health
cryptoclaw channels status --probe
cryptoclaw doctor
```

---

## Architecture

```
Telegram / WhatsApp / Discord / Slack / Signal / iMessage / Matrix / ...
               │
               ▼
┌──────────────────────────────────────┐
│              Gateway                 │
│          (control plane)             │
│        ws://127.0.0.1:18789          │
└──────────────┬───────────────────────┘
               │
               ├─ AI Agent (RPC / streaming)
               │    └─ Skills: binance-spot, wallet-manager, token-swap, ...
               ├─ CLI  (cryptoclaw …)
               ├─ WebChat UI
               └─ macOS / iOS / Android nodes
```

The Gateway is the local control plane. The AI agent connects to it via WebSocket RPC, loads skills on demand, and routes responses back to any connected channel. Everything runs on your machine.

---

## Development

```bash
git clone https://github.com/TermiX-official/cryptoclaw.git
cd cryptoclaw

pnpm install
pnpm build

# Dev loop
pnpm gateway:watch

# Run tests
pnpm test

# Type check
pnpm tsgo
```

---

## Security

CryptoClaw connects to real messaging surfaces and real on-chain infrastructure. Treat inbound messages as **untrusted input** by default.

- **DM pairing** — unknown senders get a pairing code challenge; the agent does not process their message until approved.
- **Wallet signing** — private keys never leave your machine; all signing is local.
- **Token audit** — `binance-token-audit` and `security-check` skills run automatically before swaps when configured.
- **Mainnet confirmation** — Binance spot and swap skills require explicit user confirmation before executing mainnet transactions.

Run `cryptoclaw doctor` to surface misconfigured security policies.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

_Built on [OpenClaw](https://github.com/openclaw/openclaw) — the open-source AI gateway platform._
