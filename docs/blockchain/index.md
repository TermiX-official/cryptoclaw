---
summary: "CryptoClaw blockchain capabilities — wallet management, DeFi, NFTs, and multi-chain support across 16+ EVM networks."
title: "Blockchain Overview"
---

# Blockchain Overview

CryptoClaw extends a multi-channel AI assistant with native blockchain capabilities. Interact with EVM-compatible chains directly from chat — manage wallets, swap tokens, track portfolios, deploy contracts, and more.

## Supported networks

CryptoClaw supports **16+ EVM-compatible chains** including:

| Network           | Chain ID | Default |
| ----------------- | -------- | ------- |
| BNB Smart Chain   | 56       | Yes     |
| Ethereum          | 1        |         |
| Polygon           | 137      |         |
| Arbitrum One      | 42161    |         |
| Optimism          | 10       |         |
| Base              | 8453     |         |
| Avalanche C-Chain | 43114    |         |
| Fantom            | 250      |         |
| Cronos            | 25       |         |
| zkSync Era        | 324      |         |
| BSC Testnet       | 97       |         |
| Sepolia           | 11155111 |         |

Specify any chain by name or ID when calling tools. BSC is the default.

## Security model

All blockchain operations in CryptoClaw follow strict security principles:

- **Encrypted at rest** — Private keys stored with AES-256-GCM encryption (scrypt KDF)
- **Confirmation gates** — State-changing operations (transfers, swaps, contract writes) require explicit user confirmation
- **Spending limits** — Configurable per-transaction and daily USD caps
- **Key redaction** — Private keys are never exposed in agent transcripts
- **CLI-only sensitive ops** — Import/export operations restricted to the CLI

See [Transaction Security](/blockchain/security) for the full architecture.

## Capabilities

<Columns>
  <Card title="Wallet Management" href="/blockchain/wallet" icon="wallet">
    Create, import, and manage encrypted wallets. Check balances across chains.
  </Card>
  <Card title="Token Swap" href="/blockchain/swap" icon="arrow-left-right">
    Swap tokens on PancakeSwap, Uniswap V2/V3 with slippage protection.
  </Card>
  <Card title="DeFi Dashboard" href="/blockchain/defi" icon="bar-chart-3">
    Monitor yield farming, staking, and liquidity pool positions.
  </Card>
  <Card title="Market Data" href="/blockchain/market-data" icon="trending-up">
    Real-time prices, charts, trending tokens, and on-chain analytics.
  </Card>
  <Card title="Portfolio Tracker" href="/blockchain/portfolio" icon="pie-chart">
    Aggregate holdings across wallets and networks with USD valuations.
  </Card>
  <Card title="Smart Contracts" href="/blockchain/contracts" icon="file-code">
    Deploy, call, and verify contracts on any supported chain.
  </Card>
  <Card title="NFT Manager" href="/blockchain/nft" icon="image">
    Mint, transfer, and query ERC-721 and ERC-1155 tokens.
  </Card>
  <Card title="AAVE Lending" href="/blockchain/aave" icon="landmark">
    Supply, borrow, and repay on Aave V3 (BSC).
  </Card>
  <Card title="Agent Identity" href="/blockchain/agent-identity" icon="fingerprint">
    Register on-chain AI agent identity via ERC-8004.
  </Card>
</Columns>

## Quick start

<Steps>
  <Step title="Install CryptoClaw">
    ```bash
    npm install -g @termix-it/cryptoclaw
    ```
  </Step>
  <Step title="Create a wallet">
    ```bash
    cryptoclaw onboard --wallet
    ```
    Or ask the agent: "Create a new wallet"
  </Step>
  <Step title="Start interacting">
    Ask the agent to check balances, swap tokens, or track your portfolio.
  </Step>
</Steps>
