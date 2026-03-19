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
- **Agentic Commerce (ERC-8183)** — on-chain job escrow for AI agent commerce with trustless evaluation
- **Agent Identity (ERC-8004)** — verifiable on-chain AI agent identity with reputation tracking

### Market Intelligence

- **Binance market rankings** — trending, smart money inflow, social hype, Binance Alpha
- **Smart Money signals** — follow professional on-chain buy/sell activity (BSC + Solana)
- **Meme token discovery** — real-time launchpad tracking (Pump.fun, Four.meme, Moonit)
- **CoinGecko & DeFiLlama** — prices, market caps, TVL, protocol analytics
- **Macro calendar** — Fed rates, CPI, economic events impacting crypto
- **Hyperliquid** — perpetual futures and spot trading on Hyperliquid DEX
- **Whale watcher** — monitor large on-chain transactions

### Security Infrastructure

- **TEE (Trusted Execution Environment)** — optional hardware-isolated enclave for private key signing and API secret protection. When enabled, all wallet signing (transfers, swaps, contract calls) and exchange API requests execute inside the TEE — secrets never enter the Node.js process.
- **SecureVault** — unified interface for secret operations with automatic TEE detection. Falls back to in-process signing when TEE is not available.
- **Signed API Requests** — `signed_api_request` tool lets agents call exchange APIs (Binance, OKX, Bybit) without touching API keys or secrets.

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

## Agentic Commerce (ERC-8183)

CryptoClaw implements [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183) — an on-chain job escrow protocol for AI agent commerce. Clients post jobs, lock funds in escrow, providers execute work, and evaluators approve or reject — settlement is automatic and trustless.

### How It Works

```
Client creates job → Sets budget → Funds escrow (USDC)
    → Provider submits deliverable → Evaluator approves → Funds released
```

### CryptoClaw Agent as Evaluator

CryptoClaw agents can act as **autonomous Evaluators** for ERC-8183 jobs. When a Provider submits work, the agent automatically runs the Client's verification program, settles the job on-chain, and generates a cryptographic proof of the evaluation result.

Three evaluation modes are supported:

| Mode                 | How it works                                                                                                                                                                      | Trust model                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **zkVM Evaluator**   | Client provides a verification program (RISC-V binary). Agent runs it inside a zkVM (SP1/RISC Zero) against the deliverable. ZK proof guarantees the program produced the result. | Mathematical proof — zero trust needed |
| **TEE Evaluator**    | Agent runs evaluation logic (including LLM calls) inside a TEE enclave. Attestation proves the code ran in an isolated environment.                                               | Hardware proof — trust Intel/AMD       |
| **Manual Evaluator** | Agent calls `job_complete` or `job_reject` based on the operator's instruction.                                                                                                   | Trust the evaluator                    |

#### zkVM Evaluation Flow

```
Client                     Provider                  CryptoClaw Agent (Evaluator)
  │                          │                            │
  │ createJob()              │                            │
  │ + upload test_suite.elf  │                            │
  │   to IPFS (QmXyz...)    │                            │
  │ + fund()                 │                            │
  │                          │                            │
  │                   submit()                            │
  │                   deliverable → IPFS (QmAbc...)       │
  │                          │                            │
  │                          │     zkvm_evaluate_job()    │
  │                          │     1. Fetch test_suite    │
  │                          │     2. Fetch deliverable   │
  │                          │     3. Verify program hash │
  │                          │     4. Execute in zkVM:    │
  │                          │        test_suite(deliver) │
  │                          │     5. exit 0 → PASS       │
  │                          │     6. Generate ZK proof   │
  │                          │     7. On-chain:           │
  │                          │        complete(jobId)     │
  │                          │                            │
  │              Payment received ←─────────────────────────│
  │                          │                            │
  Anyone can verify:                                      │
  proof proves "program QmXyz on input QmAbc = exit 0"    │
  Evaluator cannot fake the result.                       │
```

### Tools

| Tool                | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `job_create`        | Create a new job with evaluator, deadline, description                   |
| `job_set_budget`    | Set or negotiate budget in USDC                                          |
| `job_fund`          | Lock USDC into escrow (auto-handles ERC-20 approval)                     |
| `job_submit`        | Provider submits deliverable (IPFS CID / hash)                           |
| `job_complete`      | Evaluator approves, releasing funds to provider                          |
| `job_reject`        | Reject job with reason (refunds to client)                               |
| `job_claim_refund`  | Claim refund for expired job (permissionless)                            |
| `job_query`         | Query job details by ID                                                  |
| `job_list`          | List jobs by wallet address and role                                     |
| `zkvm_evaluate_job` | Run Client's verification program in zkVM, generate ZK proof, settle job |
| `zkvm_status`       | Check available zkVM backends (SP1, RISC Zero, native)                   |

### Verification Program Specification

The Client provides a verification program that defines the acceptance criteria for a job. The zkVM Evaluator runs this program on the Provider's deliverable and generates a ZK proof of the result.

**Program format:** Compiled RISC-V ELF binary (the standard target for SP1 and RISC Zero zkVMs).

**Program I/O contract:**

| Channel       | Usage                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| **stdin**     | Receives the deliverable content                                                           |
| **stdout**    | Outputs evaluation details (human-readable)                                                |
| **exit code** | `0` = pass (triggers `complete`), non-zero = fail (triggers `reject`)                      |
| **env vars**  | `ZKVM_JOB_DESCRIPTION` (job description), `ZKVM_DELIVERABLE_HASH` (SHA-256 of deliverable) |

**Program distribution:** Upload the compiled ELF binary to IPFS and include the CID + SHA-256 hash in the job description. The Evaluator fetches the binary, verifies its hash, and executes it inside the zkVM.

**What can a verification program do?**

| Verification type | Example              | Description                                      |
| ----------------- | -------------------- | ------------------------------------------------ |
| Unit tests        | `test_erc20.elf`     | Run a test suite against submitted code          |
| Format validation | `check_schema.elf`   | Validate JSON/XML/Protobuf against a schema      |
| Data integrity    | `verify_dataset.elf` | Check checksums, row counts, value ranges        |
| Benchmark         | `perf_check.elf`     | Verify an algorithm meets performance criteria   |
| String matching   | `keyword_check.elf`  | Check for required sections, keywords, structure |
| Hash verification | `verify_hash.elf`    | Confirm deliverable matches a known hash         |

**Supported languages** (anything that compiles to RISC-V):

| Language | Toolchain                                           | Notes                             |
| -------- | --------------------------------------------------- | --------------------------------- |
| Rust     | `cargo prove build` (SP1) or `cargo risczero build` | Recommended — best zkVM support   |
| C/C++    | `riscv64-unknown-elf-gcc`                           | Standard RISC-V cross-compilation |
| Go       | `GOOS=linux GOARCH=riscv64`                         | Experimental, larger binaries     |
| Zig      | `zig build -Dtarget=riscv64-linux`                  | Lightweight alternative           |

**Example — Rust verification program:**

```rust
use std::io::Read;

fn main() {
    let mut deliverable = String::new();
    std::io::stdin().read_to_string(&mut deliverable).unwrap();

    let job_desc = std::env::var("ZKVM_JOB_DESCRIPTION").unwrap_or_default();

    // Example: verify an ERC-20 contract has required functions
    let required = ["transfer", "approve", "balanceOf", "totalSupply"];
    let missing: Vec<_> = required.iter()
        .filter(|f| !deliverable.contains(**f))
        .collect();

    if missing.is_empty() {
        println!("PASS: All {} required functions found", required.len());
        std::process::exit(0); // → triggers complete()
    } else {
        println!("FAIL: Missing functions: {:?}", missing);
        std::process::exit(1); // → triggers reject()
    }
}
```

### ERC-8004 Integration

ERC-8183 composes with [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) (Trustless Agents). Use `agent_identity` to verify a provider's on-chain identity and `agent_reputation` to check their trust score before creating or accepting a job.

### Deployed Contracts

| Network      | ACPCore                                      | Payment Token (USDC)                         |
| ------------ | -------------------------------------------- | -------------------------------------------- |
| Base Mainnet | `0x16213AB6a660A24f36d4F8DdACA7a3d0856A8AF5` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Base Sepolia | `0x16213AB6a660A24f36d4F8DdACA7a3d0856A8AF5` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

---

## TEE (Trusted Execution Environment)

CryptoClaw supports optional TEE hardware isolation for private keys and API secrets. When enabled, all signing operations (wallet transactions, exchange API requests) execute inside a TEE enclave — secrets never enter the main Node.js process.

### What TEE Protects

| Operation                                      | Without TEE                      | With TEE                                  |
| ---------------------------------------------- | -------------------------------- | ----------------------------------------- |
| Wallet signing (transfer, swap, contract call) | Private key in Node.js memory    | Signing inside enclave, key never exposed |
| Exchange API requests (Binance, OKX)           | API secret in Node.js memory     | HMAC signing inside enclave               |
| Key storage                                    | AES-256-GCM encrypted file       | Enclave-encrypted memory                  |
| Server compromise                              | Attacker can dump process memory | Attacker cannot read enclave memory       |

### Setup

Enable TEE during onboarding (Manual mode) or via config:

```bash
# Via onboarding wizard
cryptoclaw onboard   # Select "Manual" → enable TEE when prompted

# Or via config
cryptoclaw config set tee.endpoint http://localhost:3443
cryptoclaw config set tee.transport grpc
```

### Start the Enclave

```bash
# Development (no hardware isolation, full functionality)
ENCLAVE_PORT=3443 bun src/secure-vault/enclave/server.ts

# Production (hardware-isolated, same code)
gramine-sgx bun src/secure-vault/enclave/server.ts   # Intel SGX
```

### Deployment Options

| Platform            | Command                                  | Hardware Isolation | Attestation      |
| ------------------- | ---------------------------------------- | ------------------ | ---------------- |
| Local (dev)         | `bun server.ts`                          | None               | Placeholder      |
| Intel SGX (Gramine) | `gramine-sgx bun server.ts`              | SGX enclave        | Real MRENCLAVE   |
| AWS Nitro Enclave   | Package as EIF → `nitro-cli run-enclave` | Nitro isolation    | Real PCR         |
| Phala dStack        | `dstack deploy`                          | Confidential VM    | Real attestation |
| Marlin Oyster       | `oyster deploy`                          | TEE CVM            | RA-TLS           |

TEE is fully optional. Without it, CryptoClaw works exactly as before — all signing happens in-process.

See [`src/secure-vault/enclave/README.md`](src/secure-vault/enclave/README.md) for detailed setup instructions.

---

## Skills Library (80+)

CryptoClaw ships with 80+ skills covering crypto, DeFi, productivity, and automation. Skills are loaded per-conversation and give the AI agent native access to external tools and APIs.

### Crypto & DeFi

| Skill                    | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `binance-spot`           | Binance CEX spot trading — 60+ endpoints               |
| `binance-market-rank`    | Trending tokens, smart money, social hype rankings     |
| `binance-token-info`     | Token search, metadata, real-time data, K-lines        |
| `binance-token-audit`    | Security audit for honeypots and rug pulls             |
| `binance-trading-signal` | Smart Money on-chain buy/sell signals                  |
| `binance-address-info`   | Wallet portfolio query across chains                   |
| `binance-meme-rush`      | Launchpad meme token and trend discovery               |
| `wallet-manager`         | Create, import, and manage blockchain wallets          |
| `token-swap`             | Swap tokens on Uniswap/PancakeSwap                     |
| `coingecko`              | Prices, market caps, charts, trending tokens           |
| `defillama`              | TVL, protocol analytics, yield pools                   |
| `debank`                 | Wallet portfolios and DeFi positions                   |
| `etherscan`              | Block explorer queries (ETH, BSC, Polygon, etc.)       |
| `hyperliquid`            | Perpetual futures and spot on Hyperliquid DEX          |
| `aave-bsc`               | Aave V3 lending on BSC                                 |
| `dune`                   | Custom SQL analytics on Dune                           |
| `gas-tracker`            | Gas prices across networks                             |
| `whale-watcher`          | Large on-chain transaction monitoring                  |
| `market-data`            | Multi-source price and market data                     |
| `security-check`         | Token/address security via GoPlus API                  |
| `portfolio-tracker`      | Track holdings and portfolio value                     |
| `defi-dashboard`         | Yield farming, staking, liquidity pools                |
| `nft-manager`            | View, transfer, manage NFTs                            |
| `contract-deployer`      | Deploy ERC20/ERC721 from templates                     |
| `four-meme`              | BSC launchpad token discovery                          |
| `macro-calendar`         | Macro events (Fed, CPI, economic calendar)             |
| `agent-identity`         | On-chain AI agent identity (ERC-8004)                  |
| `agentic-commerce`       | On-chain job escrow for agent commerce (ERC-8183)      |
| `zkvm-evaluator`         | Trustless job evaluation with ZK proof (SP1/RISC Zero) |

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
┌──────────────────────────────────────────────────────┐
│                    Gateway                           │
│               (control plane)                        │
│             ws://127.0.0.1:18789                     │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ AI Agent    │  │ Blockchain  │  │ SecureVault  │  │
│  │ + Skills    │  │ Extension   │  │ (TEE proxy)  │  │
│  └─────────────┘  └──────┬──────┘  └──────┬───────┘  │
│                          │                │          │
│  ERC-8183 Commerce ──────┘                │          │
│  ERC-8004 Identity ──────┘                │          │
└──────────────────────────────────────┬────┘──────────┘
               │                       │
               │                 ┌─────▼──────────────┐
               │                 │ TEE Enclave         │
               │                 │ (optional)          │
               │                 │ Private keys + API  │
               │                 │ secrets never leave │
               │                 └────────────────────┘
               │
               ├─ CLI  (cryptoclaw …)
               ├─ WebChat UI
               └─ macOS / iOS / Android nodes
```

The Gateway is the local control plane. The AI agent connects to it via WebSocket RPC, loads skills on demand, and routes responses back to any connected channel. Everything runs on your machine. When TEE is enabled, all signing operations are delegated to the hardware-isolated enclave.

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
- **Wallet signing** — private keys never leave your machine; all signing is local. With TEE enabled, signing happens inside a hardware-isolated enclave.
- **TEE protection** — optional hardware-level isolation for private keys, API secrets, and signing operations. Even root access cannot read enclave memory.
- **SecureVault** — exchange API credentials (Binance, OKX, Bybit) are managed through the vault. The `signed_api_request` tool handles signing without exposing secrets to the AI agent.
- **Token audit** — `binance-token-audit` and `security-check` skills run automatically before swaps when configured.
- **Mainnet confirmation** — all state-changing tools (transfers, swaps, orders, ERC-8183 jobs) require explicit user confirmation.
- **ERC-8183 escrow** — funds are held in the on-chain ACPCore contract until terminal state. `claimRefund` is permissionless and cannot be blocked by hooks.

Run `cryptoclaw doctor` to surface misconfigured security policies.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

_Built on [OpenClaw](https://github.com/openclaw/openclaw) — the open-source AI gateway platform._
