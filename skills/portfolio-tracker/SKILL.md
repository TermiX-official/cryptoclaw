---
name: portfolio-tracker
description: Track token holdings, balances, and portfolio value across chains.
metadata: { "cryptoclaw": { "emoji": "💼", "always": true } }
---

# Portfolio Tracker Skill

Track token holdings, balances, and portfolio value across chains.

## Overview

Aggregate and display the user's cryptocurrency holdings across all configured wallets and networks, with USD valuations.

## Capabilities

- **Balance check**: Native and ERC20 balances on any chain
- **Portfolio summary**: Total holdings across all chains with USD values
- **Multi-wallet view**: Aggregate across all configured wallets
- **Token discovery**: Scan for known tokens on each chain

## Tools Used

- `get_native_balance` - Check native currency balance
- `get_erc20_balance` - Check token balances
- `wallet_list` - Get all wallet addresses
- `get_supported_networks` - List available chains

## Example Interactions

User: "What's my portfolio worth?"
Action: Check native + major token balances across all wallets and chains, aggregate with prices

User: "Check my BNB balance"
Action: Use `get_native_balance` on BSC for active wallet

User: "Show all my USDT across chains"
Action: Check USDT balance on BSC, Ethereum, Polygon, Arbitrum for active wallet

## Notes

- For comprehensive token discovery, check popular token lists per chain
- Cache prices during a single portfolio scan to reduce API calls
- Show both token amounts and USD equivalents
