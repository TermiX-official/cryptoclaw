---
summary: "Real-time cryptocurrency prices, charts, trending tokens, and on-chain analytics."
title: "Market Data"
---

# Market Data

CryptoClaw provides real-time and historical cryptocurrency market data through multiple data providers.

## Data providers

| Provider       |    API Key     | Rate Limit         | Features                           |
| -------------- | :------------: | ------------------ | ---------------------------------- |
| CoinGecko      |  Not required  | ~30 calls/min      | Prices, markets, trending, history |
| Dune Analytics | `DUNE_API_KEY` | 10 exec/day (free) | Custom SQL queries, on-chain data  |
| DeFiLlama      |  Not required  | Generous           | TVL, yields, stablecoin data       |

## CoinGecko operations

| Operation       | Description                                         |
| --------------- | --------------------------------------------------- |
| Price lookup    | Current price in USD/BTC/ETH for any token          |
| Market overview | Top tokens by market cap with 24h changes           |
| Trending tokens | Currently trending on CoinGecko                     |
| Price history   | Historical price charts (1d, 7d, 30d, 1y)           |
| Token search    | Find tokens by name or symbol                       |
| Token details   | Full info including links, description, market data |

### Examples

```
"What's the price of BNB?"
"Show me the top 10 tokens by market cap"
"What's trending on CoinGecko?"
"Show BTC price chart for the last 30 days"
"Find token info for Chainlink"
```

## Dune Analytics

Query on-chain data with custom SQL through the Dune API.

### Setup

```bash
export DUNE_API_KEY=your_key_here
```

### Operations

| Operation       | Description                  |
| --------------- | ---------------------------- |
| Execute query   | Run a DuneSQL query          |
| Check status    | Poll query execution status  |
| Get results     | Retrieve query results       |
| Run saved query | Execute a public query by ID |

### Useful public queries

| Query ID | Description                     |
| -------- | ------------------------------- |
| 3286091  | Weekly DEX volume by protocol   |
| 3237721  | Daily active addresses by chain |
| 2781844  | Stablecoin supply breakdown     |

### Examples

```
"Run Dune query 3286091 for weekly DEX volumes"
"Query total gas spent on Ethereum today"
"Show daily active addresses on BSC this week"
```

## DeFiLlama

Protocol and yield data without an API key.

| Operation       | Description                                 |
| --------------- | ------------------------------------------- |
| Protocol TVL    | Current and historical TVL for any protocol |
| Chain TVL       | Total TVL per blockchain                    |
| Yield pools     | Top yield pools ranked by APY               |
| Stablecoin data | Supply and chain distribution               |
| Token prices    | Price data for on-chain tokens              |

### Examples

```
"What's Aave's total TVL?"
"Compare TVL across BSC, Ethereum, and Polygon"
"Top stablecoin yield pools on Ethereum"
"Show PancakeSwap TVL history"
```

## Related

- [Portfolio Tracker](/blockchain/portfolio) — Track your own holdings
- [DeFi Dashboard](/blockchain/defi) — Monitor your DeFi positions
