---
summary: "跨钱包和网络聚合加密货币持仓，实时 USD 估值。"
title: "投资组合"
---

# 投资组合

CryptoClaw 聚合并显示所有钱包和网络的加密货币持仓及实时 USD 估值。

## 工具

| 工具                     | 描述                            |
| ------------------------ | ------------------------------- |
| `get_native_balance`     | 查询原生代币余额（BNB、ETH 等） |
| `get_erc20_balance`      | 查询 ERC-20 代币余额            |
| `wallet_list`            | 列出所有管理的钱包              |
| `get_supported_networks` | 列出可用网络                    |

## 功能

- **多钱包聚合** — 查看所有钱包的汇总持仓
- **多链支持** — 16+ EVM 链的余额
- **USD 估值** — 使用 CoinGecko 价格实时转换
- **代币细分** — 各代币余额及占比

## DeBank 增强数据

配置 DeBank API 获取包含 DeFi 仓位的综合视图：

```bash
export DEBANK_API_KEY=your_key_here
```

DeBank 提供：跨 100+ 链总资产、按链余额细分、代币持仓、DeFi 仓位、NFT 持仓、交易历史。

## 示例

```
"显示我的投资组合"
"所有钱包的总余额是多少？"
"列出我在 BSC 上的代币持仓"
"按链显示资产分布"
```

## 相关

- [钱包管理](/zh-CN/blockchain/wallet) — 创建和管理钱包
- [市场数据](/zh-CN/blockchain/market-data) — 查看当前价格
- [DeFi 仪表板](/zh-CN/blockchain/defi) — 详细 DeFi 仓位
