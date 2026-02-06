import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import type { WalletManager } from "../../wallet/wallet-manager.js";
import { resolveActivePrivateKey } from "../../wallet/active-wallet.js";
import { DEFAULT_CHAIN_ID, resolveChainId } from "../chains.js";
import { getNativeBalance, getERC20Balance } from "../services/balance.js";
import { getERC20TokenInfo } from "../services/tokens.js";
import { transferNativeToken, transferERC20, approveERC20 } from "../services/transfer.js";

export function registerTokenTools(api: OpenClawPluginApi, walletManager: WalletManager) {
  api.registerTool({
    name: "get_native_balance",
    description:
      "Get the native currency balance (ETH, BNB, MATIC, etc.) for an address. Uses active wallet address if none provided.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Wallet address or ENS name. Defaults to active wallet.",
        },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
    },
    async execute(params: { address?: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const address = params.address ?? walletManager.getActiveAddress();
      if (!address) {
        throw new Error("No address provided and no active wallet");
      }
      const result = await getNativeBalance(address, chainId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: "get_erc20_balance",
    description: "Get the ERC20 token balance for an address",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Wallet address or ENS name. Defaults to active wallet.",
        },
        tokenAddress: { type: "string", description: "ERC20 token contract address" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["tokenAddress"],
    },
    async execute(params: { address?: string; tokenAddress: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const address = params.address ?? walletManager.getActiveAddress();
      if (!address) {
        throw new Error("No address provided and no active wallet");
      }
      const result = await getERC20Balance(address, params.tokenAddress, chainId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: "get_erc20_token_info",
    description: "Get ERC20 token metadata: name, symbol, decimals, total supply",
    parameters: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "ERC20 token contract address" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["tokenAddress"],
    },
    async execute(params: { tokenAddress: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const result = await getERC20TokenInfo(params.tokenAddress, chainId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: "transfer_native_token",
    description:
      "Send native currency (ETH, BNB, MATIC, etc.) to an address. Uses the active wallet.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient address or ENS name" },
        amount: { type: "string", description: "Amount to send (e.g., '0.1')" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["to", "amount"],
    },
    async execute(params: { to: string; amount: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const privateKey = await resolveActivePrivateKey(walletManager);
      const result = await transferNativeToken(privateKey, params.to, params.amount, chainId);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: "transfer_erc20",
    description: "Transfer ERC20 tokens to an address. Uses the active wallet.",
    parameters: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "ERC20 token contract address" },
        to: { type: "string", description: "Recipient address or ENS name" },
        amount: { type: "string", description: "Amount to send" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["tokenAddress", "to", "amount"],
    },
    async execute(params: { tokenAddress: string; to: string; amount: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const privateKey = await resolveActivePrivateKey(walletManager);
      const result = await transferERC20(
        privateKey,
        params.tokenAddress,
        params.to,
        params.amount,
        chainId,
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });

  api.registerTool({
    name: "approve_token_spending",
    description: "Approve a spender to use your ERC20 tokens (for DEX swaps, staking, etc.)",
    parameters: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "ERC20 token contract address" },
        spender: { type: "string", description: "Address to approve for spending" },
        amount: { type: "string", description: "Amount to approve" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["tokenAddress", "spender", "amount"],
    },
    async execute(params: {
      tokenAddress: string;
      spender: string;
      amount: string;
      network?: string;
    }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const privateKey = await resolveActivePrivateKey(walletManager);
      const result = await approveERC20(
        privateKey,
        params.tokenAddress,
        params.spender,
        params.amount,
        chainId,
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}
