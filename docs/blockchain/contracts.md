---
summary: "Deploy, call, and verify smart contracts on any supported EVM chain."
title: "Smart Contracts"
---

# Smart Contracts

CryptoClaw helps you deploy and interact with smart contracts across supported EVM chains.

## Operations

| Tool                  | Description                               | Confirmation |
| --------------------- | ----------------------------------------- | :----------: |
| `write_contract`      | Execute a state-changing contract call    |     Yes      |
| `read_contract`       | Read data from a contract                 |              |
| `get_contract_abi`    | Fetch verified contract ABI from explorer |              |
| `get_contract_source` | Fetch verified source code                |              |
| `deploy_contract`     | Deploy a contract from bytecode           |     Yes      |

## Contract deployment

CryptoClaw provides templates for common token standards:

| Template | Standard | Description                                   |
| -------- | -------- | --------------------------------------------- |
| ERC-20   | Token    | Fungible token with standard transfer/approve |
| ERC-721  | NFT      | Non-fungible token collection                 |

### Deployment flow

<Steps>
  <Step title="Describe your contract">
    Tell the agent what you want to deploy. For example: "Deploy an ERC-20 token called MyToken with symbol MTK and 1 million supply"
  </Step>
  <Step title="Review parameters">
    The agent prepares the deployment with gas estimation and shows all parameters for review.
  </Step>
  <Step title="Confirm and deploy">
    Approve the transaction. The agent submits the deployment and returns the contract address.
  </Step>
</Steps>

<Warning>
Always test deployments on a testnet (BSC Testnet, Sepolia) before deploying to mainnet. Mainnet deployments cost real funds and are irreversible.
</Warning>

## Contract interaction

### Reading contract data

```
"Read the totalSupply of contract 0x..."
"What's the owner of contract 0x... on BSC?"
"Get the balance of 0x... on the USDT contract"
```

### Writing to contracts

```
"Call the approve function on USDT contract for 100 tokens"
"Execute the stake function on contract 0x... with 10 BNB"
```

All write operations require confirmation through the tx-gate.

## Explorer integration

CryptoClaw integrates with block explorers via the Etherscan API family:

| Chain    | Explorer             |
| -------- | -------------------- |
| Ethereum | Etherscan            |
| BSC      | BSCScan              |
| Polygon  | Polygonscan          |
| Arbitrum | Arbiscan             |
| Optimism | Optimistic Etherscan |
| Base     | BaseScan             |

### Setup

```bash
export ETHERSCAN_API_KEY=your_key_here
```

### Explorer operations

- Fetch verified contract ABI for dynamic interaction
- View contract source code
- Query transaction history
- Check token transfers
- Monitor gas prices

## Related

- [NFT Manager](/blockchain/nft) — Specialized NFT operations
- [Transaction Security](/blockchain/security) — Confirmation and spending limits
