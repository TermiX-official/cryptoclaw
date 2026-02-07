---
summary: "在 PancakeSwap 和 Uniswap 上兑换代币，带滑点保护和蜜罐检测。"
title: "代币兑换"
---

# 代币兑换

CryptoClaw 支持在主要去中心化交易所跨 EVM 链兑换代币。

## 支持的 DEX

| DEX         | 版本   | 链                                          |
| ----------- | ------ | ------------------------------------------- |
| PancakeSwap | V2, V3 | BSC, Ethereum                               |
| Uniswap     | V2, V3 | Ethereum, Polygon, Arbitrum, Optimism, Base |

## 工具

| 工具              | 描述                     | 需确认 |
| ----------------- | ------------------------ | :----: |
| `swap_quote`      | 获取交易对报价           |        |
| `swap_execute`    | 执行兑换                 |   是   |
| `check_allowance` | 检查代币授权额度         |        |
| `get_dex_list`    | 列出链上可用 DEX         |        |
| `get_token_info`  | 通过地址或符号查代币信息 |        |

## 兑换流程

<Steps>
  <Step title="获取报价">
    询问："报价 1 BNB 兑换 USDT（PancakeSwap）"

    代理获取最佳路由，显示预期输出、价格影响和费用。

  </Step>
  <Step title="审查并确认">
    代理显示输入/输出金额、汇率、价格影响、滑点容差和 Gas 估算。确认后方可执行。
  </Step>
  <Step title="执行">
    兑换在链上提交。代理返回交易哈希和最终金额。
  </Step>
</Steps>

## 安全特性

- **滑点保护** — 默认 0.5% 滑点容差，可按笔配置
- **价格影响预警** — 影响超过 3% 时告警
- **蜜罐检测** — 检查无法卖出的代币
- **授权管理** — 需要时自动处理 approve 流程
- **花费限制** — 遵守已配置的单笔和每日 USD 上限

<Warning>
请始终验证代币合约地址。代理会警告未验证的代币，但对不熟悉的代币请保持谨慎。
</Warning>

## 示例

```
"兑换 0.5 BNB 为 USDT（PancakeSwap）"
"报价 100 USDC 到 ETH（Uniswap V3）"
"Polygon 上有哪些 DEX？"
"查看我对 PancakeSwap 路由的 USDT 授权"
```

## 相关

- [DeFi 仪表板](/zh-CN/blockchain/defi) — 监控 LP 和收益仓位
- [市场数据](/zh-CN/blockchain/market-data) — 兑换前查价格
