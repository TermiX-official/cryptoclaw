---
summary: "CryptoClaw capabilities across channels, routing, blockchain, media, and UX."
read_when:
  - You want a full list of what CryptoClaw supports
title: "Features"
---

## Highlights

<Columns>
  <Card title="Channels" icon="message-square">
    WhatsApp, Telegram, Discord, and iMessage with a single Gateway.
  </Card>
  <Card title="Blockchain" icon="link">
    Wallet management, token swaps, DeFi, NFTs across 16+ EVM chains.
  </Card>
  <Card title="Routing" icon="route">
    Multi-agent routing with isolated sessions.
  </Card>
  <Card title="Media" icon="image">
    Images, audio, and documents in and out.
  </Card>
  <Card title="Apps and UI" icon="monitor">
    Web Control UI and macOS companion app.
  </Card>
  <Card title="Mobile nodes" icon="smartphone">
    iOS and Android nodes with Canvas support.
  </Card>
</Columns>

## Full list

### Messaging and channels

- WhatsApp integration via WhatsApp Web (Baileys)
- Telegram bot support (grammY)
- Discord bot support (channels.discord.js)
- Mattermost bot support (plugin)
- iMessage integration via local imsg CLI (macOS)
- Group chat support with mention based activation
- Media support for images, audio, and documents
- Optional voice note transcription hook

### Blockchain and crypto

- Encrypted wallet management (AES-256-GCM, scrypt KDF)
- Token swaps on PancakeSwap and Uniswap (V2/V3) across multiple chains
- DeFi position monitoring (Aave, PancakeSwap, Uniswap, Compound)
- Real-time market data via CoinGecko, DeFiLlama, and Dune Analytics
- Portfolio tracking with multi-wallet aggregation and USD valuation
- Smart contract deployment, interaction, and verification
- NFT management (ERC-721 and ERC-1155)
- AAVE V3 lending and borrowing on BSC
- On-chain agent identity registration via ERC-8004
- Transaction confirmation gates with spending limits
- Private key redaction from agent transcripts
- 16+ EVM chain support (BSC default)

### Agent and platform

- Agent bridge with tool streaming
- Streaming and chunking for long responses
- Multi-agent routing for isolated sessions per workspace or sender
- Subscription auth for Anthropic and OpenAI via OAuth
- Sessions: direct chats collapse into shared `main`; groups are isolated
- WebChat and macOS menu bar app
- iOS node with pairing and Canvas surface
- Android node with pairing, Canvas, chat, and camera

<Note>
See the [Blockchain](/blockchain) section for detailed documentation on all crypto capabilities.
</Note>
