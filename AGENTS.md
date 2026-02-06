# CryptoClaw Repository Guidelines

CryptoClaw is a private cryptocurrency AI assistant built on top of a multi-channel messaging platform.

## Project Structure

- Source code: `src/` (CLI in `src/cli`, commands in `src/commands`, infra in `src/infra`)
- Tests: colocated `*.test.ts`
- Blockchain extension: `extensions/blockchain/` (EVM tools, wallet management, tx-gate)
- Other extensions: `extensions/*` (channels: discord, telegram, slack, signal, whatsapp, etc.)
- Crypto skills: `skills/` (wallet-manager, market-data, token-swap, portfolio-tracker, etc.)
- Config dir: `~/.cryptoclaw/` (config: `cryptoclaw.json`)
- Wallet storage: `~/.cryptoclaw/wallets/` (encrypted keystore + metadata)

## Build & Dev Commands

- Runtime: Node 22+
- Install: `pnpm install`
- Build: `pnpm build`
- TypeScript checks: `pnpm tsgo`
- Lint/format: `pnpm check`
- Tests: `pnpm test`
- Dev CLI: `pnpm cryptoclaw ...`

## Coding Style

- Language: TypeScript (ESM), strict typing, avoid `any`
- Formatting: Oxlint + Oxfmt; run `pnpm check` before commits
- Keep files under ~500 LOC; split when it improves clarity
- Use **CryptoClaw** for product name; `cryptoclaw` for CLI/package/paths
- Env vars: `CRYPTOCLAW_*` prefix

## Blockchain Extension (`extensions/blockchain/`)

- EVM services in `src/evm/services/` (adapted from bnbchain-mcp)
- Tools registered via `api.registerTool()` in `src/evm/tools/`
- Wallet management in `src/wallet/` (AES-256-GCM encrypted keystore)
- Transaction security in `src/tx-gate/` (confirmation hooks, spending limits)
- Supports 16+ EVM networks (BSC default, Ethereum, Polygon, Arbitrum, etc.)
- Private keys NEVER exposed in agent transcripts (stripped via tool_result_persist hook)

## Security Rules

- All private keys encrypted at rest with AES-256-GCM (scrypt KDF)
- Keystore file: `0600` permissions
- State-changing tools require confirmation (before_tool_call hook)
- Spending limits: per-tx and daily USD caps (configurable)
- Private keys redacted from session transcripts

## Commit Guidelines

- Use `scripts/committer "<msg>" <file...>` for commits
- Concise, action-oriented messages (e.g., "blockchain: add transfer tool")
- Group related changes; avoid bundling unrelated work

## Testing

- Framework: Vitest with V8 coverage (70% thresholds)
- Run `pnpm test` before pushing
- Blockchain tests should use testnets (BSC Testnet, Sepolia)
