import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import type { WalletManager } from "../../wallet/wallet-manager.js";
import { resolveActivePrivateKey } from "../../wallet/active-wallet.js";
import { DEFAULT_CHAIN_ID, resolveChainId } from "../chains.js";
import { getERC721TokenMetadata } from "../services/tokens.js";
import { transferERC721, transferERC1155 } from "../services/transfer.js";

export function registerNftTools(api: OpenClawPluginApi, walletManager: WalletManager) {
  api.registerTool({
    name: "get_nft_info",
    description: "Get ERC721 NFT metadata including name, symbol, token URI, and owner",
    parameters: {
      type: "object",
      properties: {
        nftAddress: { type: "string", description: "NFT contract address" },
        tokenId: { type: "string", description: "Token ID" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["nftAddress", "tokenId"],
    },
    async execute(
      _toolCallId: string,
      params: { nftAddress: string; tokenId: string; network?: string },
    ) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const result = await getERC721TokenMetadata(
        params.nftAddress,
        BigInt(params.tokenId),
        chainId,
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: "transfer_nft",
    description: "Transfer an ERC721 NFT to another address. Uses the active wallet.",
    parameters: {
      type: "object",
      properties: {
        nftAddress: { type: "string", description: "NFT contract address" },
        to: { type: "string", description: "Recipient address" },
        tokenId: { type: "string", description: "Token ID to transfer" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["nftAddress", "to", "tokenId"],
    },
    async execute(
      _toolCallId: string,
      params: { nftAddress: string; to: string; tokenId: string; network?: string },
    ) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const privateKey = await resolveActivePrivateKey(walletManager);
      const result = await transferERC721(
        privateKey,
        params.nftAddress,
        params.to,
        BigInt(params.tokenId),
        chainId,
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: "transfer_erc1155",
    description:
      "Transfer ERC1155 tokens (semi-fungible) to another address. Uses the active wallet.",
    parameters: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "ERC1155 contract address" },
        to: { type: "string", description: "Recipient address" },
        tokenId: { type: "string", description: "Token ID" },
        amount: { type: "string", description: "Amount to transfer" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["tokenAddress", "to", "tokenId", "amount"],
    },
    async execute(
      _toolCallId: string,
      params: {
        tokenAddress: string;
        to: string;
        tokenId: string;
        amount: string;
        network?: string;
      },
    ) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const privateKey = await resolveActivePrivateKey(walletManager);
      const result = await transferERC1155(
        privateKey,
        params.tokenAddress,
        params.to,
        BigInt(params.tokenId),
        BigInt(params.amount),
        chainId,
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}
