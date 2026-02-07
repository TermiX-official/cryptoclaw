---
summary: "CryptoClaw 区块链功能 — 钱包管理、DeFi、NFT 和 16+ EVM 链支持。"
title: "区块链概览"
---

# 区块链概览

CryptoClaw 将多渠道 AI 助手扩展为原生区块链工具。通过聊天直接与 EVM 兼容链交互 — 管理钱包、兑换代币、追踪投资组合、部署合约等。

## 支持的网络

CryptoClaw 支持 **16+ EVM 兼容链**，包括：

| 网络              | 链 ID    | 默认 |
| ----------------- | -------- | ---- |
| BNB Smart Chain   | 56       | 是   |
| Ethereum          | 1        |      |
| Polygon           | 137      |      |
| Arbitrum One      | 42161    |      |
| Optimism          | 10       |      |
| Base              | 8453     |      |
| Avalanche C-Chain | 43114    |      |
| Fantom            | 250      |      |
| Cronos            | 25       |      |
| zkSync Era        | 324      |      |
| BSC 测试网        | 97       |      |
| Sepolia           | 11155111 |      |

调用工具时可通过名称或 ID 指定链。BSC 为默认链。

## 安全模型

所有区块链操作遵循严格的安全原则：

- **静态加密** — 私钥使用 AES-256-GCM 加密存储（scrypt KDF）
- **确认门控** — 状态变更操作（转账、兑换、合约写入）需要用户明确确认
- **花费限制** — 可配置单笔和每日 USD 上限
- **密钥脱敏** — 私钥永不暴露在代理对话记录中
- **仅 CLI 敏感操作** — 导入/导出仅限终端

详见 [交易安全](/zh-CN/blockchain/security)。

## 功能

<Columns>
  <Card title="钱包管理" href="/zh-CN/blockchain/wallet" icon="wallet">
    创建、导入和管理加密钱包。跨链查余额。
  </Card>
  <Card title="代币兑换" href="/zh-CN/blockchain/swap" icon="arrow-left-right">
    在 PancakeSwap、Uniswap V2/V3 上兑换代币，带滑点保护。
  </Card>
  <Card title="DeFi 仪表板" href="/zh-CN/blockchain/defi" icon="bar-chart-3">
    监控收益农场、质押和流动性池仓位。
  </Card>
  <Card title="市场数据" href="/zh-CN/blockchain/market-data" icon="trending-up">
    实时价格、图表、热门代币和链上分析。
  </Card>
  <Card title="投资组合" href="/zh-CN/blockchain/portfolio" icon="pie-chart">
    跨钱包和网络的资产聚合，USD 估值。
  </Card>
  <Card title="智能合约" href="/zh-CN/blockchain/contracts" icon="file-code">
    在任何支持链上部署、调用和验证合约。
  </Card>
  <Card title="NFT 管理" href="/zh-CN/blockchain/nft" icon="image">
    铸造、转移和查询 ERC-721 和 ERC-1155 代币。
  </Card>
  <Card title="AAVE 借贷" href="/zh-CN/blockchain/aave" icon="landmark">
    在 Aave V3 (BSC) 上存入、借出和偿还。
  </Card>
  <Card title="代理身份" href="/zh-CN/blockchain/agent-identity" icon="fingerprint">
    通过 ERC-8004 注册链上 AI 代理身份。
  </Card>
</Columns>

## 快速开始

<Steps>
  <Step title="安装 CryptoClaw">
    ```bash
    npm install -g @termix-it/cryptoclaw
    ```
  </Step>
  <Step title="创建钱包">
    ```bash
    cryptoclaw onboard --wallet
    ```
    或直接对代理说："创建一个新钱包"
  </Step>
  <Step title="开始交互">
    让代理查余额、兑换代币或追踪投资组合。
  </Step>
</Steps>
