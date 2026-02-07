---
summary: "Create, import, and manage blockchain wallets with AES-256-GCM encrypted keystore."
title: "Wallet Management"
---

# Wallet Management

CryptoClaw provides secure wallet management for interacting with EVM-compatible blockchains. All wallets are stored locally with AES-256-GCM encryption.

## Supported operations

| Tool            | Description                                   | Confirmation |
| --------------- | --------------------------------------------- | :----------: |
| `wallet_create` | Generate a new wallet with encrypted keystore |              |
| `wallet_list`   | List all stored wallets and active wallet     |              |
| `wallet_switch` | Switch the active wallet                      |              |
| `wallet_delete` | Remove a wallet from keystore                 |     Yes      |
| `wallet_import` | Import a wallet from private key (CLI only)   |              |
| `wallet_export` | Export wallet private key (CLI only)          |              |

<Warning>
Import and export operations are restricted to the CLI for security. They cannot be triggered through chat channels.
</Warning>

## Creating a wallet

Ask the agent to create a wallet, or use the CLI:

```bash
cryptoclaw onboard --wallet
```

The agent will:

1. Generate a new keypair
2. Encrypt the private key with your passphrase (AES-256-GCM, scrypt KDF)
3. Store it in `~/.cryptoclaw/wallets/`
4. Return the public address

## Checking balances

Ask the agent to check your balance on any supported network:

- "What's my BNB balance?"
- "Show my ETH balance on Ethereum"
- "Check USDT balance on Polygon"

The agent uses `get_native_balance` and `get_erc20_balance` tools to query on-chain data.

## Wallet storage

Wallets are stored at `~/.cryptoclaw/wallets/` with the following structure:

- **Keystore file**: AES-256-GCM encrypted private key with scrypt-derived key
- **File permissions**: `0600` (owner read/write only)
- **Metadata**: Address, creation date, label

## Configuration

Wallet settings are part of the CryptoClaw configuration at `~/.cryptoclaw/cryptoclaw.json`:

```json5
{
  blockchain: {
    defaultNetwork: "bsc", // Default chain for operations
    walletDir: "wallets", // Relative to state dir
  },
}
```

## Security

See [Transaction Security](/blockchain/security) for details on:

- Passphrase-based encryption
- Confirmation gates for state-changing operations
- Private key redaction from transcripts
