---
summary: "铸造、转移和查询 ERC-721 和 ERC-1155 NFT。"
title: "NFT 管理"
---

# NFT 管理

CryptoClaw 管理 ERC-721 和 ERC-1155 标准的 NFT 集合和单个代币。

## 支持的标准

| 标准     | 描述                                      |
| -------- | ----------------------------------------- |
| ERC-721  | 非同质化代币 — 唯一物品                   |
| ERC-1155 | 多代币标准 — 同一合约中的同质化和非同质化 |

## 操作

| 工具                  | 描述                               | 需确认 |
| --------------------- | ---------------------------------- | :----: |
| `transfer_nft`        | 转移 ERC-721 代币                  |   是   |
| `transfer_erc1155`    | 转移 ERC-1155 代币                 |   是   |
| `get_nft_metadata`    | 查看代币元数据（名称、图片、属性） |        |
| `get_nft_holdings`    | 列出地址拥有的 NFT                 |        |
| `get_collection_info` | 集合级统计（供应量、地板价等）     |        |

## 示例

```
"显示我在 BSC 上的 NFT"
"集合 0x... 中代币 #42 的元数据是什么？"
"将集合 0x... 中的 NFT #7 转给 0xRecipient"
"列出我在 Ethereum 上钱包中的所有 NFT"
```

<Warning>
转移 NFT 时，请确保接收地址支持该代币标准。发送到未实现接收接口的合约可能导致永久丢失。
</Warning>

## 相关

- [智能合约](/zh-CN/blockchain/contracts) — 部署 NFT 合约
- [交易安全](/zh-CN/blockchain/security) — 转移确认机制
