---
summary: "Supply, borrow, and repay on Aave V3 on BSC."
title: "AAVE Lending"
---

# AAVE Lending

CryptoClaw integrates with Aave V3 on BNB Smart Chain for lending and borrowing operations.

## Protocol addresses (BSC)

| Contract                | Address                                      |
| ----------------------- | -------------------------------------------- |
| Pool Proxy              | `0x6807dc923806fE8Fd134338EABCA509979a7e0cB` |
| Pool Addresses Provider | `0xff75B6da14FfbbfD355Daf7a2731456b3562Ba6D` |
| Protocol Data Provider  | `0x41585C50524fb8c3899B43D7D797d9486AAc94DB` |

## Supported assets

| Asset | Address                                      | Use as collateral |
| ----- | -------------------------------------------- | :---------------: |
| WBNB  | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |        Yes        |
| USDT  | `0x55d398326f99059fF775485246999027B3197955` |        Yes        |
| USDC  | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |        Yes        |
| BTCB  | `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c` |        Yes        |
| ETH   | `0x2170Ed0880ac9A755fd29B2688956BD959F933F8` |        Yes        |

## Operations

| Action               | Description                     | Confirmation |
| -------------------- | ------------------------------- | :----------: |
| `supply`             | Deposit assets to earn interest |     Yes      |
| `withdraw`           | Withdraw supplied assets        |     Yes      |
| `borrow`             | Borrow against collateral       |     Yes      |
| `repay`              | Repay borrowed assets           |     Yes      |
| `getUserAccountData` | View position summary           |              |

## Position monitoring

Ask the agent to check your Aave position:

- "What's my Aave position?" — Shows total collateral, total debt, available borrows, health factor
- "What's my health factor on Aave?" — Liquidation risk indicator (safe above 1.5)
- "How much can I borrow on Aave?" — Available borrow capacity

The `getUserAccountData` function returns:

- Total collateral (USD)
- Total debt (USD)
- Available borrows (USD)
- Liquidation threshold
- LTV ratio
- Health factor

## Examples

```
"Supply 10 USDT to Aave"
"Borrow 0.1 BNB from Aave using my USDT as collateral"
"Repay 5 USDT on Aave"
"Withdraw all my WBNB from Aave"
"What's my current Aave health factor?"
```

<Warning>
Monitor your health factor regularly. If it drops below 1.0, your position may be liquidated. The agent will warn you when health factor is below 1.5.
</Warning>

## Related

- [DeFi Dashboard](/blockchain/defi) — Monitor all DeFi positions
- [Token Swap](/blockchain/swap) — Swap tokens to repay or adjust positions
