---
summary: "实时加密货币价格、图表、热门代币和链上分析。"
title: "市场数据"
---

# 市场数据

CryptoClaw 通过多个数据提供商提供实时和历史加密货币市场数据。

## 数据提供商

| 提供商         |    API 密钥    | 限频             | 功能                      |
| -------------- | :------------: | ---------------- | ------------------------- |
| CoinGecko      |     不需要     | ~30 次/分钟      | 价格、市场、热门、历史    |
| Dune Analytics | `DUNE_API_KEY` | 10 次/天（免费） | 自定义 SQL 查询、链上数据 |
| DeFiLlama      |     不需要     | 宽松             | TVL、收益率、稳定币数据   |

## CoinGecko 操作

| 操作     | 描述                            |
| -------- | ------------------------------- |
| 价格查询 | 任意代币的 USD/BTC/ETH 当前价格 |
| 市场概览 | 按市值排名的热门代币及 24h 变化 |
| 热门代币 | CoinGecko 当前热门              |
| 价格历史 | 历史价格图表（1d, 7d, 30d, 1y） |
| 代币搜索 | 按名称或符号查找代币            |

### 示例

```
"BNB 现在什么价？"
"按市值显示前 10 名代币"
"CoinGecko 上什么在热门？"
"显示 BTC 过去 30 天价格图表"
```

## Dune Analytics

通过 Dune API 使用自定义 SQL 查询链上数据。

```bash
export DUNE_API_KEY=your_key_here
```

### 示例

```
"运行 Dune 查询 3286091 查看每周 DEX 交易量"
"查询今天以太坊上花费的总 Gas"
"显示本周 BSC 上的每日活跃地址"
```

## DeFiLlama

无需 API 密钥的协议和收益数据。

### 示例

```
"Aave 的总 TVL 是多少？"
"比较 BSC、Ethereum 和 Polygon 的 TVL"
"Ethereum 上最佳稳定币收益池"
```

## 相关

- [投资组合](/zh-CN/blockchain/portfolio) — 追踪持仓
- [DeFi 仪表板](/zh-CN/blockchain/defi) — 监控 DeFi 仓位
