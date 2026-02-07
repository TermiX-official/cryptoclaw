---
summary: "在 BSC 上的 Aave V3 上存入、借出和偿还。"
title: "AAVE 借贷"
---

# AAVE 借贷

CryptoClaw 集成了 BSC 上的 Aave V3，支持借贷操作。

## 协议地址（BSC）

| 合约                    | 地址                                         |
| ----------------------- | -------------------------------------------- |
| Pool Proxy              | `0x6807dc923806fE8Fd134338EABCA509979a7e0cB` |
| Pool Addresses Provider | `0xff75B6da14FfbbfD355Daf7a2731456b3562Ba6D` |
| Protocol Data Provider  | `0x41585C50524fb8c3899B43D7D797d9486AAc94DB` |

## 支持的资产

| 资产 | 地址                                         | 可作抵押 |
| ---- | -------------------------------------------- | :------: |
| WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |    是    |
| USDT | `0x55d398326f99059fF775485246999027B3197955` |    是    |
| USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` |    是    |
| BTCB | `0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c` |    是    |
| ETH  | `0x2170Ed0880ac9A755fd29B2688956BD959F933F8` |    是    |

## 操作

| 操作                 | 描述             | 需确认 |
| -------------------- | ---------------- | :----: |
| `supply`             | 存入资产赚取利息 |   是   |
| `withdraw`           | 提取已存入资产   |   是   |
| `borrow`             | 以抵押物借款     |   是   |
| `repay`              | 偿还借款         |   是   |
| `getUserAccountData` | 查看仓位摘要     |        |

## 仓位监控

让代理检查你的 Aave 仓位：

- "我的 Aave 仓位怎样？" — 显示总抵押、总债务、可借额度、健康系数
- "我在 Aave 的健康系数是多少？" — 清算风险指标（1.5 以上安全）
- "我在 Aave 可以借多少？" — 可用借款额度

## 示例

```
"存入 10 USDT 到 Aave"
"用 USDT 作抵押，从 Aave 借 0.1 BNB"
"在 Aave 偿还 5 USDT"
"从 Aave 提取所有 WBNB"
"当前 Aave 健康系数是多少？"
```

<Warning>
请定期监控健康系数。如果降至 1.0 以下，仓位可能被清算。代理会在健康系数低于 1.5 时发出警告。
</Warning>

## 相关

- [DeFi 仪表板](/zh-CN/blockchain/defi) — 监控所有 DeFi 仓位
- [代币兑换](/zh-CN/blockchain/swap) — 兑换代币以偿还或调整仓位
