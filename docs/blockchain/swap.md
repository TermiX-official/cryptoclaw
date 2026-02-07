---
summary: "Swap tokens on PancakeSwap and Uniswap with slippage protection and honeypot detection."
title: "Token Swap"
---

# Token Swap

CryptoClaw enables token swaps on major decentralized exchanges across multiple EVM chains.

## Supported DEXs

| DEX         | Versions | Chains                                      |
| ----------- | -------- | ------------------------------------------- |
| PancakeSwap | V2, V3   | BSC, Ethereum                               |
| Uniswap     | V2, V3   | Ethereum, Polygon, Arbitrum, Optimism, Base |

## Tools

| Tool              | Description                                | Confirmation |
| ----------------- | ------------------------------------------ | :----------: |
| `swap_quote`      | Get a price quote for a token pair         |              |
| `swap_execute`    | Execute a token swap                       |     Yes      |
| `check_allowance` | Check token spending allowance             |              |
| `get_dex_list`    | List supported DEXs for a chain            |              |
| `get_token_info`  | Look up token details by address or symbol |              |

## Swap flow

<Steps>
  <Step title="Get a quote">
    Ask: "Quote swapping 1 BNB to USDT on PancakeSwap"

    The agent fetches the best route, shows expected output, price impact, and fees.

  </Step>
  <Step title="Review and confirm">
    The agent displays:
    - Input/output amounts
    - Exchange rate
    - Price impact percentage
    - Slippage tolerance
    - Gas estimate

    You must confirm before execution.

  </Step>
  <Step title="Execute">
    The swap is submitted on-chain. The agent reports the transaction hash and final amounts.
  </Step>
</Steps>

## Safety features

- **Slippage protection** — Default 0.5% slippage tolerance, configurable per swap
- **Price impact warnings** — Alerts when price impact exceeds 3%
- **Honeypot detection** — Checks for tokens that cannot be sold
- **Allowance management** — Automatic approval flow when needed
- **Spending limits** — Respects configured per-transaction and daily USD caps

<Warning>
Always verify token contract addresses. The agent will warn about unverified tokens, but exercise caution with unfamiliar tokens.
</Warning>

## Examples

```
"Swap 0.5 BNB for USDT on PancakeSwap"
"Get a quote for 100 USDC to ETH on Uniswap V3"
"What DEXs are available on Polygon?"
"Check my USDT allowance for PancakeSwap router"
```

## Configuration

```json5
{
  blockchain: {
    swap: {
      defaultSlippage: 0.5, // Percentage
      maxPriceImpact: 5, // Percentage threshold for warnings
    },
  },
}
```

## Related

- [DeFi Dashboard](/blockchain/defi) — Monitor LP and yield positions
- [Market Data](/blockchain/market-data) — Check token prices before swapping
