---
summary: "Aggregate cryptocurrency holdings across wallets and networks with USD valuations."
title: "Portfolio Tracker"
---

# Portfolio Tracker

CryptoClaw aggregates and displays your cryptocurrency holdings across all wallets and networks with real-time USD valuations.

## Tools

| Tool                     | Description                                 |
| ------------------------ | ------------------------------------------- |
| `get_native_balance`     | Query native token balance (BNB, ETH, etc.) |
| `get_erc20_balance`      | Query ERC-20 token balance                  |
| `wallet_list`            | List all managed wallets                    |
| `get_supported_networks` | List available networks                     |

## Features

- **Multi-wallet aggregation** — View consolidated holdings across all wallets
- **Multi-chain support** — Balances from all 16+ supported EVM chains
- **USD valuation** — Real-time conversion using CoinGecko prices
- **Token breakdown** — Individual token balances with percentages

## Enhanced data with DeBank

For a comprehensive portfolio view including DeFi positions, configure the DeBank API:

```bash
export DEBANK_API_KEY=your_key_here
```

DeBank provides:

- Total portfolio value across 100+ chains
- Per-chain balance breakdown
- Token holdings with prices
- DeFi positions (lending, LP, staking)
- NFT holdings
- Transaction history

## Examples

```
"Show my portfolio"
"What's my total balance across all wallets?"
"List my token holdings on BSC"
"Show my portfolio breakdown by chain"
"What's the value of my ETH across all networks?"
```

## Related

- [Wallet Management](/blockchain/wallet) — Create and manage wallets
- [Market Data](/blockchain/market-data) — Check current prices
- [DeFi Dashboard](/blockchain/defi) — Monitor DeFi positions in detail
