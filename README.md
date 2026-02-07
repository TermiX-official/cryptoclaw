# CryptoClaw 🦞⛓️

**Your Personal Crypto AI Agent — Self-hosted, Multi-chain, Multi-channel**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-22%2B-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-ESM-blue)](https://www.typescriptlang.org/)

CryptoClaw is a self-hosted cryptocurrency AI assistant that runs on your own devices. It manages encrypted wallets, executes DEX swaps, tracks portfolios, and provides on-chain agent identity via the [ERC-8004 Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) standard — all with enterprise-grade key security.

Built on a multi-channel messaging platform, CryptoClaw answers on **WhatsApp, Telegram, Slack, Discord, Signal, iMessage**, and more. It speaks and listens on macOS/iOS/Android, and renders a live Canvas you control.

> **Fork Notice:** CryptoClaw is forked from [OpenClaw](https://github.com/nicepkg/openclaw) (formerly an open-source multi-channel AI assistant). We've extended it with a full blockchain stack — wallets, DeFi tooling, on-chain identity, and transaction security — to create a purpose-built crypto agent.

---

## Highlights

- **Multi-chain Wallets** — Create, import, and manage AES-256-GCM encrypted wallets across 16+ EVM networks
- **DEX Swaps** — Automated quoting and execution on Uniswap V2+V3, PancakeSwap V2+V3, QuickSwap
- **Token & NFT Tools** — ERC-20 transfers, approvals, NFT operations, arbitrary contract reads/writes
- **ERC-8004 Agent Identity** — On-chain identity as ERC-721 NFTs with decentralized reputation tracking
- **5-Layer Key Guard** — Private keys never leak to AI context, chat history, or messaging channels
- **Spending Limits** — Per-transaction and daily USD caps with mandatory confirmation hooks
- **Multi-channel Inbox** — WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Nostr, WebChat
- **Voice Wake + Talk** — Hands-free interaction on macOS, iOS, and Android
- **Skills Platform** — Extensible tools for market data, portfolio tracking, and custom workflows
- **Local-first Architecture** — Your keys, your data, your machine. Nothing leaves your device unless you say so.

---

## Quick Start

**Requirements:** Node.js 22+

```bash
# Install globally
npm install -g @termix-it/cryptoclaw@latest

# Run the onboarding wizard
cryptoclaw onboard --install-daemon
```

The wizard walks you through:

1. Gateway setup (local or remote)
2. LLM provider auth (Anthropic, OpenAI, Google, etc.)
3. Channel connections (WhatsApp, Telegram, etc.)
4. Skill installation
5. **Wallet creation** — create or import your first crypto wallet

### Create a Wallet

```bash
# Create a new wallet
cryptoclaw wallet create --label "Trading"

# Import an existing wallet
cryptoclaw wallet import --label "DeFi"

# List wallets
cryptoclaw wallet list
```

### Chat with Your Agent

```bash
# CLI chat mode
cryptoclaw

# Example prompts:
# "What's my BNB balance?"
# "Swap 0.1 BNB for USDC on BSC"
# "Register my agent on Ethereum"
# "Show my portfolio"
```

---

## Supported Networks

### Mainnets

| Network         | Chain ID | Native Token | DEX Support               |
| --------------- | -------- | ------------ | ------------------------- |
| Ethereum        | 1        | ETH          | Uniswap V2 + V3           |
| BNB Smart Chain | 56       | BNB          | PancakeSwap V2 + V3       |
| Polygon         | 137      | MATIC        | QuickSwap V2 + Uniswap V3 |
| Arbitrum One    | 42161    | ETH          | Uniswap V2 + V3           |
| Optimism        | 10       | ETH          | Uniswap V3                |
| Base            | 8453     | ETH          | Uniswap V3                |
| opBNB           | 204      | BNB          | —                         |
| IoTeX           | 4689     | IOTX         | —                         |

### Testnets

| Network          | Chain ID | Native Token |
| ---------------- | -------- | ------------ |
| Sepolia          | 11155111 | ETH          |
| BSC Testnet      | 97       | tBNB         |
| Polygon Amoy     | 80002    | MATIC        |
| Arbitrum Sepolia | 421614   | ETH          |
| Optimism Sepolia | 11155420 | ETH          |
| Base Sepolia     | 84532    | ETH          |
| opBNB Testnet    | 5611     | tBNB         |
| IoTeX Testnet    | 4690     | IOTX         |

---

## Crypto Skills

| Skill               | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `wallet-manager`    | Create, import, list, switch, delete, and export encrypted wallets |
| `market-data`       | Real-time token prices, charts, market cap from multiple providers |
| `token-swap`        | DEX swap quoting (V2 + V3) and execution with slippage protection  |
| `portfolio-tracker` | Multi-chain portfolio value tracking and PnL analysis              |
| `agent-identity`    | ERC-8004 on-chain agent registration and reputation queries        |
| `token-tools`       | ERC-20 balance checks, transfers, and approvals                    |
| `nft-tools`         | ERC-721/1155 transfers, metadata queries, and enumeration          |
| `contract-tools`    | Read/write arbitrary smart contracts with ABI decoding             |
| `network-tools`     | Chain info, gas prices, block explorers, network status            |
| `tx-tools`          | Transaction lookup, receipt parsing, and history                   |

---

## Security Model

CryptoClaw implements **defense-in-depth** for private key protection:

```
Layer 1: Tool Design      — import/export are CLI-only, never exposed as agent tools
Layer 2: Parameter Guard   — passphrases & keys stripped from tool call parameters
Layer 3: Result Sanitize   — all tool results scrubbed before session transcript persistence
Layer 4: Outbound Sanitize — messages to channels scrubbed before sending
Layer 5: System Prompt     — agent instructed to never handle or output private keys
```

### Encryption

- **Algorithm:** AES-256-GCM with scrypt key derivation function
- **Keystore permissions:** `0600` (owner read/write only)
- **Passphrase caching:** Configurable TTL, auto-expires from memory
- **Wallet storage:** `~/.cryptoclaw/wallets/` (encrypted keystore + metadata)

### Spending Limits

- **Per-transaction maximum:** $1,000 USD (configurable)
- **Daily limit:** $5,000 USD (configurable)
- **Confirmation required:** All state-changing operations (transfers, swaps, approvals) require explicit user confirmation via `before_tool_call` hook

### State-changing Tools (Require Confirmation)

`token_transfer`, `token_approve`, `nft_transfer`, `execute_swap`, `deploy_contract`, `write_contract`, `agent_register`, `agent_set_wallet`

---

## ERC-8004 Agent Identity

CryptoClaw supports the [ERC-8004 Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004) standard for on-chain AI agent identity:

- **Register** your agent as an ERC-721 NFT on any supported chain
- **Set a wallet** for your agent via EIP-712 signed messages
- **Build reputation** through on-chain feedback from users and other agents
- **Query identity** — look up any agent's metadata, wallet, and reputation score
- **Deployed** across 18 chains (10 mainnet + 8 testnet)

### Contract Addresses

| Contract            | Mainnet                                      | Testnet                                      |
| ------------------- | -------------------------------------------- | -------------------------------------------- |
| Identity Registry   | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation Registry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

### Example Usage

```
> Register my agent on BSC with URI https://myagent.example.com/metadata.json
✅ Agent registered! ID: #42, TX: 0xabc...

> What's my agent's reputation?
📊 Agent #42: 4.7/5.0 (23 reviews)

> List my registered agents
🤖 Agent #42 (BSC) — https://myagent.example.com/metadata.json
🤖 Agent #108 (Ethereum) — https://myagent.example.com/metadata.json
```

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Messaging Channels                  │
│  WhatsApp · Telegram · Slack · Discord · Signal       │
│  iMessage · Nostr · WebChat · Voice                   │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│              Gateway (Control Plane)                   │
│  Session management · Auth · Routing · Cron · Hooks   │
└───┬───────────┬───────────┬───────────┬──────────────┘
    │           │           │           │
┌───▼───┐ ┌────▼───┐ ┌─────▼───┐ ┌─────▼──────────────┐
│  CLI  │ │ WebChat│ │  Apps   │ │ Blockchain Extension│
│       │ │  (UI)  │ │macOS/   │ │                     │
│       │ │        │ │iOS/     │ │ Wallets · DEX Swaps │
│       │ │        │ │Android  │ │ ERC-8004 · Tx Gate  │
└───────┘ └────────┘ └─────────┘ └─────────────────────┘
```

### Project Structure

```
src/                    # Core source code
├── cli/                # CLI commands and options
├── commands/           # Command implementations
├── config/             # Configuration and paths
├── gateway/            # Gateway server and protocol
├── agents/             # Agent runners and tools
├── wizard/             # Onboarding wizard
└── ...

extensions/
├── blockchain/         # 🔑 Blockchain extension (wallets, swaps, identity)
│   ├── src/evm/        # EVM services and tools
│   ├── src/wallet/     # Wallet manager, keystore, key guard
│   └── src/tx-gate/    # Transaction confirmation and spending limits
├── discord/            # Discord channel
├── telegram/           # Telegram channel
├── slack/              # Slack channel
├── signal/             # Signal channel
├── whatsapp/           # WhatsApp channel
└── ...

skills/                 # Skill definitions (SKILL.md)
apps/                   # Native apps (macOS, iOS, Android)
ui/                     # WebChat UI
```

---

## Development

```bash
git clone https://github.com/TermiX-official/cryptoclaw.git
cd cryptoclaw
pnpm install
pnpm build
```

### Commands

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `pnpm build`      | Build all packages                |
| `pnpm test`       | Run full test suite (5100+ tests) |
| `pnpm check`      | Lint + format + type check        |
| `pnpm tsgo`       | TypeScript type checking only     |
| `pnpm cryptoclaw` | Run CLI in development mode       |

### Testing

- **Framework:** Vitest with V8 coverage (70% thresholds)
- **Test count:** 5100+ tests across 880+ test files
- **Coverage:** Blockchain extension, plugins, channels, gateway, CLI, config

```bash
# Run all tests
pnpm test

# Run specific test file
npx vitest run extensions/blockchain/src/evm/services/swap.test.ts

# Run with coverage
pnpm test -- --coverage
```

---

## Configuration

CryptoClaw stores configuration at `~/.cryptoclaw/`:

```
~/.cryptoclaw/
├── cryptoclaw.json          # Main configuration
├── wallets/                 # Encrypted wallet keystore
├── agents/                  # Agent sessions and transcripts
├── credentials/             # Channel auth tokens
└── agent-identity.json      # ERC-8004 agent identity
```

### Environment Variables

| Variable                       | Description                                         |
| ------------------------------ | --------------------------------------------------- |
| `CRYPTOCLAW_STATE_DIR`         | Override state directory (default: `~/.cryptoclaw`) |
| `CRYPTOCLAW_CONFIG_PATH`       | Override config file path                           |
| `CRYPTOCLAW_GATEWAY_PORT`      | Gateway server port (default: 19000)                |
| `CRYPTOCLAW_PROFILE`           | Named profile for multiple instances                |
| `CRYPTOCLAW_WALLET_PASSPHRASE` | Wallet passphrase for non-interactive mode          |

---

## Attribution

CryptoClaw is a fork of [OpenClaw](https://github.com/nicepkg/openclaw), an open-source multi-channel AI assistant originally built by the OpenClaw community. We are grateful to the original authors and contributors for their foundational work.

**What we added:**

- Full blockchain extension with multi-chain EVM support
- Encrypted wallet management with AES-256-GCM keystore
- DEX swap tools (Uniswap/PancakeSwap V2+V3)
- ERC-8004 Trustless Agents on-chain identity system
- 5-layer private key security guard
- Transaction confirmation hooks and spending limits
- CLI wallet onboarding wizard
- Nostr channel extension
- CryptoClaw branding and crypto-focused skill set

## License

[MIT](LICENSE)

---

<p align="center">
  Built by <a href="https://github.com/TermiX-official">TermiX</a> · Forked from <a href="https://github.com/nicepkg/openclaw">OpenClaw</a>
</p>
