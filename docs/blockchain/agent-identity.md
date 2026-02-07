---
summary: "Register and manage on-chain AI agent identity using ERC-8004 Trustless Agents standard."
title: "Agent Identity (ERC-8004)"
---

# Agent Identity (ERC-8004)

CryptoClaw supports on-chain AI agent identity registration via the **ERC-8004 Trustless Agents** standard. This gives your agent a verifiable on-chain identity and reputation.

## What is ERC-8004?

ERC-8004 defines a standard for registering AI agents on-chain with:

- **Identity registry** — Map agent addresses to metadata (name, capabilities, version)
- **Reputation registry** — Track agent reputation scores and endorsements
- **Trustless verification** — Anyone can verify an agent's identity on-chain

## Tools

| Tool                    | Description                          | Confirmation |
| ----------------------- | ------------------------------------ | :----------: |
| `agent_register`        | Register agent identity on-chain     |     Yes      |
| `agent_identity`        | Query agent identity information     |              |
| `agent_set_wallet`      | Update the agent's associated wallet |     Yes      |
| `agent_reputation`      | Check agent reputation score         |              |
| `agent_list_registered` | List registered agents               |              |

## Supported networks

Agent identity can be registered on 10+ networks:

| Network     | Registry type |
| ----------- | ------------- |
| BSC         | Mainnet       |
| Ethereum    | Mainnet       |
| Polygon     | Mainnet       |
| Arbitrum    | Mainnet       |
| Base        | Mainnet       |
| BSC Testnet | Testnet       |
| Sepolia     | Testnet       |

## Registration flow

<Steps>
  <Step title="Prepare identity">
    The agent collects identity metadata: name, description, capabilities, and version.
  </Step>
  <Step title="Choose network">
    Select which chain to register on. BSC is recommended for low gas costs.
  </Step>
  <Step title="Confirm and register">
    Review the registration transaction and confirm. The identity is stored on-chain.
  </Step>
</Steps>

## Identity persistence

Agent identity data is persisted locally at `~/.cryptoclaw/agent-identity.json` for quick access without on-chain queries.

## Examples

```
"Register my agent identity on BSC"
"What's my agent's on-chain reputation?"
"List all registered agents on BSC Testnet"
"Update my agent's wallet address"
"Show my agent identity details"
```

## Related

- [Wallet Management](/blockchain/wallet) — Wallet used for registration
- [Transaction Security](/blockchain/security) — Registration requires confirmation
