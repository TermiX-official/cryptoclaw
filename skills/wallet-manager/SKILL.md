---
name: wallet-manager
description: Create, import, and manage blockchain wallets securely.
metadata: { "cryptoclaw": { "emoji": "👛", "always": true } }
---

# Wallet Manager Skill

Create, import, and manage blockchain wallets securely.

## Overview

This skill helps users manage their crypto wallets through the blockchain extension. All private keys are encrypted with AES-256-GCM and stored locally.

## Capabilities

- **Create wallet**: Generate a new wallet with a random private key
- **List wallets**: Show all wallets with addresses and labels
- **Switch wallet**: Change the active wallet for operations
- **Delete wallet**: Remove a wallet (requires passphrase)

## Tools Used

- `wallet_create` - Generate and encrypt a new wallet
- `wallet_list` - List wallets (metadata only)
- `wallet_switch` - Change active wallet
- `wallet_delete` - Remove a wallet

## CLI-Only Operations

The following operations are restricted to terminal access for security. They are **not** available as agent tools and must be run directly:

- `cryptoclaw wallet import` - Import an existing private key
- `cryptoclaw wallet export` - Export a private key for backup

These operations handle raw private keys and are intentionally excluded from the agent context to prevent accidental key exposure in chat messages or session transcripts.

## Security Rules

- NEVER display private keys in agent responses
- ALWAYS require passphrase for sensitive operations
- Import and export are CLI-only — do NOT attempt to call them as tools
- Suggest creating a new wallet rather than importing when possible

## Example Interactions

User: "Create a new wallet for trading"
Action: Use `wallet_create` with label "Trading"

User: "Show my wallets"
Action: Use `wallet_list` to display all wallets

User: "Switch to my DeFi wallet"
Action: Use `wallet_switch` with the wallet label
