---
summary: "在任何支持的 EVM 链上部署、调用和验证智能合约。"
title: "智能合约"
---

# 智能合约

CryptoClaw 帮助你在支持的 EVM 链上部署和交互智能合约。

## 操作

| 工具                  | 描述                       | 需确认 |
| --------------------- | -------------------------- | :----: |
| `write_contract`      | 执行状态变更合约调用       |   是   |
| `read_contract`       | 读取合约数据               |        |
| `get_contract_abi`    | 从浏览器获取已验证合约 ABI |        |
| `get_contract_source` | 获取已验证源代码           |        |
| `deploy_contract`     | 从字节码部署合约           |   是   |

## 合约部署

CryptoClaw 提供常见代币标准的模板：

| 模板    | 标准 | 描述                               |
| ------- | ---- | ---------------------------------- |
| ERC-20  | 代币 | 标准 transfer/approve 的同质化代币 |
| ERC-721 | NFT  | 非同质化代币集合                   |

<Warning>
在部署到主网之前，请先在测试网（BSC Testnet、Sepolia）上测试。主网部署花费真实资金且不可逆。
</Warning>

## 合约交互

### 读取数据

```
"读取合约 0x... 的 totalSupply"
"BSC 上合约 0x... 的 owner 是谁？"
```

### 写入合约

```
"调用 USDT 合约的 approve 函数，授权 100 代币"
"执行合约 0x... 的 stake 函数，质押 10 BNB"
```

所有写入操作需通过 tx-gate 确认。

## 浏览器集成

通过 Etherscan API 系列集成区块浏览器：

```bash
export ETHERSCAN_API_KEY=your_key_here
```

支持：获取已验证合约 ABI、查看源代码、查询交易历史、检查代币转账、监控 Gas 价格。

## 相关

- [NFT 管理](/zh-CN/blockchain/nft) — 专门的 NFT 操作
- [交易安全](/zh-CN/blockchain/security) — 确认和花费限制
