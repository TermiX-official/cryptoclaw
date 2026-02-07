---
summary: "创建、导入和管理区块链钱包，使用 AES-256-GCM 加密密钥库。"
title: "钱包管理"
---

# 钱包管理

CryptoClaw 提供安全的钱包管理功能，用于与 EVM 兼容区块链交互。所有钱包使用 AES-256-GCM 加密本地存储。

## 支持的操作

| 工具            | 描述                       | 需确认 |
| --------------- | -------------------------- | :----: |
| `wallet_create` | 生成新钱包并加密存储       |        |
| `wallet_list`   | 列出所有钱包和当前活跃钱包 |        |
| `wallet_switch` | 切换活跃钱包               |        |
| `wallet_delete` | 从密钥库移除钱包           |   是   |
| `wallet_import` | 通过私钥导入钱包（仅 CLI） |        |
| `wallet_export` | 导出钱包私钥（仅 CLI）     |        |

<Warning>
导入和导出操作仅限 CLI，不可通过聊天渠道触发。
</Warning>

## 创建钱包

让代理创建钱包，或使用 CLI：

```bash
cryptoclaw onboard --wallet
```

代理会：

1. 生成新密钥对
2. 使用密码短语加密私钥（AES-256-GCM，scrypt KDF）
3. 存储到 `~/.cryptoclaw/wallets/`
4. 返回公开地址

## 查询余额

让代理查询任意网络上的余额：

- "我的 BNB 余额是多少？"
- "查看我在 Ethereum 上的 ETH 余额"
- "查询 Polygon 上的 USDT 余额"

## 钱包存储

钱包存储于 `~/.cryptoclaw/wallets/`：

- **密钥库文件**：AES-256-GCM 加密私钥，scrypt 派生密钥
- **文件权限**：`0600`（仅所有者读写）
- **元数据**：地址、创建日期、标签

## 配置

钱包设置位于 `~/.cryptoclaw/cryptoclaw.json`：

```json5
{
  blockchain: {
    defaultNetwork: "bsc", // 默认操作链
    walletDir: "wallets", // 相对于状态目录
  },
}
```

## 安全

详见 [交易安全](/zh-CN/blockchain/security)。
