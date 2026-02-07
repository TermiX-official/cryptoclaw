---
summary: "使用 ERC-8004 无信任代理标准注册和管理链上 AI 代理身份。"
title: "代理身份（ERC-8004）"
---

# 代理身份（ERC-8004）

CryptoClaw 支持通过 **ERC-8004 无信任代理** 标准进行链上 AI 代理身份注册，为你的代理提供可验证的链上身份和声誉。

## 什么是 ERC-8004？

ERC-8004 定义了在链上注册 AI 代理的标准：

- **身份注册表** — 将代理地址映射到元数据（名称、能力、版本）
- **声誉注册表** — 跟踪代理声誉分数和背书
- **无信任验证** — 任何人都可以在链上验证代理身份

## 工具

| 工具                    | 描述             | 需确认 |
| ----------------------- | ---------------- | :----: |
| `agent_register`        | 注册链上代理身份 |   是   |
| `agent_identity`        | 查询代理身份信息 |        |
| `agent_set_wallet`      | 更新代理关联钱包 |   是   |
| `agent_reputation`      | 查看代理声誉分数 |        |
| `agent_list_registered` | 列出已注册代理   |        |

## 支持的网络

代理身份可在 10+ 网络上注册，包括 BSC、Ethereum、Polygon、Arbitrum、Base 等主网，以及 BSC Testnet 和 Sepolia 测试网。

## 注册流程

<Steps>
  <Step title="准备身份">
    代理收集身份元数据：名称、描述、能力和版本。
  </Step>
  <Step title="选择网络">
    选择注册链。推荐 BSC（Gas 费低）。
  </Step>
  <Step title="确认并注册">
    审查注册交易并确认。身份存储在链上。
  </Step>
</Steps>

## 身份持久化

代理身份数据本地持久化于 `~/.cryptoclaw/agent-identity.json`，无需链上查询即可快速访问。

## 示例

```
"在 BSC 上注册我的代理身份"
"我的代理链上声誉如何？"
"列出 BSC Testnet 上所有已注册代理"
"更新我代理的钱包地址"
```

## 相关

- [钱包管理](/zh-CN/blockchain/wallet) — 用于注册的钱包
- [交易安全](/zh-CN/blockchain/security) — 注册需要确认
