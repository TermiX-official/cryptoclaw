---
summary: "Monitor DeFi positions — yield farming, staking, liquidity pools, and protocol analytics."
title: "DeFi Dashboard"
---

# DeFi Dashboard

CryptoClaw provides a comprehensive DeFi monitoring dashboard that tracks your positions across protocols and surfaces yield opportunities.

## Data sources

The DeFi dashboard combines data from multiple sources:

- **On-chain contract queries** — Direct reads from protocol contracts (Aave, PancakeSwap, Uniswap, Compound)
- **DeFiLlama API** — TVL data, protocol analytics, yield pool rankings (no API key required)
- **DeBank API** — Wallet-level DeFi positions across 100+ chains (requires `DEBANK_API_KEY`)

## Supported protocols

| Protocol    | Chains                            | Features                               |
| ----------- | --------------------------------- | -------------------------------------- |
| PancakeSwap | BSC, Ethereum                     | LP positions, farming rewards          |
| Uniswap     | Ethereum, Polygon, Arbitrum, Base | V2/V3 positions, fee earnings          |
| Aave        | BSC, Ethereum, Polygon            | Supply/borrow positions, health factor |
| Compound    | Ethereum                          | Supply/borrow positions                |

## Operations

**Position monitoring:**

- "Show my DeFi positions" — Lists all active positions across protocols
- "What's my Aave health factor?" — Checks liquidation risk
- "How much am I earning on PancakeSwap?" — Shows farming rewards

**Protocol analytics:**

- "What's the TVL of Aave?" — Total value locked via DeFiLlama
- "Top yield pools on BSC" — Ranked by APY
- "Compare lending rates across protocols" — Side-by-side comparison

**Yield discovery:**

- "Best stablecoin yields on Ethereum" — Filtered yield pool search
- "Show trending DeFi protocols" — Protocols with growing TVL

## Configuration

Set up API keys for enhanced data:

```bash
# Optional: DeBank for wallet-level positions
export DEBANK_API_KEY=your_key_here
```

DeFiLlama data works without any API key.

## Related

- [Token Swap](/blockchain/swap) — Execute swaps on DEXs
- [AAVE Lending](/blockchain/aave) — Supply, borrow, and repay on Aave V3
- [Portfolio Tracker](/blockchain/portfolio) — Aggregate holdings view
