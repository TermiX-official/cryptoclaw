---
summary: "Mint, transfer, and query ERC-721 and ERC-1155 NFTs."
title: "NFT Manager"
---

# NFT Manager

CryptoClaw manages NFT collections and individual tokens across ERC-721 and ERC-1155 standards.

## Supported standards

| Standard | Description                                             |
| -------- | ------------------------------------------------------- |
| ERC-721  | Non-fungible tokens — unique items                      |
| ERC-1155 | Multi-token — fungible and non-fungible in one contract |

## Operations

| Tool                  | Description                                   | Confirmation |
| --------------------- | --------------------------------------------- | :----------: |
| `transfer_nft`        | Transfer an ERC-721 token                     |     Yes      |
| `transfer_erc1155`    | Transfer ERC-1155 tokens                      |     Yes      |
| `get_nft_metadata`    | View token metadata (name, image, attributes) |              |
| `get_nft_holdings`    | List NFTs owned by an address                 |              |
| `get_collection_info` | Collection-level stats (supply, floor, etc.)  |              |

## Examples

```
"Show my NFTs on BSC"
"What's the metadata for token #42 in collection 0x...?"
"Transfer NFT #7 from collection 0x... to 0xRecipient"
"List all NFTs in my wallet on Ethereum"
"Show collection info for 0x..."
```

<Warning>
When transferring NFTs, ensure the recipient address supports the token standard. Sending to a contract that doesn't implement the receiver interface may result in permanent loss.
</Warning>

## Related

- [Smart Contracts](/blockchain/contracts) — Deploy NFT contracts
- [Transaction Security](/blockchain/security) — Transfer confirmations
