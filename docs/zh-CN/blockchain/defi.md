---
summary: "监控 DeFi 仓位 — 收益农场、质押、流动性池和协议分析。"
title: "DeFi 仪表板"
---

# DeFi 仪表板

CryptoClaw 提供综合 DeFi 监控仪表板，跟踪跨协议仓位并展示收益机会。

## 数据来源

| 来源          |     API 密钥     | 功能                                          |
| ------------- | :--------------: | --------------------------------------------- |
| 链上合约查询  |      不需要      | Aave、PancakeSwap、Uniswap、Compound 协议直读 |
| DeFiLlama API |      不需要      | TVL 数据、协议分析、收益池排名                |
| DeBank API    | `DEBANK_API_KEY` | 钱包级 DeFi 仓位（100+ 链）                   |

## 支持的协议

| 协议        | 链                                | 功能                   |
| ----------- | --------------------------------- | ---------------------- |
| PancakeSwap | BSC, Ethereum                     | LP 仓位、挖矿奖励      |
| Uniswap     | Ethereum, Polygon, Arbitrum, Base | V2/V3 仓位、手续费收入 |
| Aave        | BSC, Ethereum, Polygon            | 存借仓位、健康系数     |
| Compound    | Ethereum                          | 存借仓位               |

## 操作示例

```
"显示我的 DeFi 仓位"
"我的 Aave 健康系数是多少？"
"在 PancakeSwap 上赚了多少？"
"Aave 的 TVL 是多少？"
"BSC 上收益最高的池子"
"最佳稳定币收益在 Ethereum 上"
```

## 配置

```bash
# 可选：DeBank 获取钱包级仓位
export DEBANK_API_KEY=your_key_here
```

## 相关

- [代币兑换](/zh-CN/blockchain/swap) — 在 DEX 上执行兑换
- [AAVE 借贷](/zh-CN/blockchain/aave) — Aave V3 操作
- [投资组合](/zh-CN/blockchain/portfolio) — 资产聚合视图
