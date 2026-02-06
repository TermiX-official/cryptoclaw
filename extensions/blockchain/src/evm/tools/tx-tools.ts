import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import type { WalletManager } from "../../wallet/wallet-manager.js";
import { DEFAULT_CHAIN_ID, resolveChainId } from "../chains.js";
import { estimateGas, getTransaction, getTransactionReceipt } from "../services/transactions.js";
import { formatJson } from "../services/utils.js";

export function registerTxTools(api: OpenClawPluginApi, _walletManager: WalletManager) {
  api.registerTool({
    name: "get_transaction",
    description: "Get details of a transaction by its hash",
    parameters: {
      type: "object",
      properties: {
        txHash: { type: "string", description: "Transaction hash (0x-prefixed)" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["txHash"],
    },
    async execute(params: { txHash: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const tx = await getTransaction(params.txHash as `0x${string}`, chainId);
      return { content: [{ type: "text", text: formatJson(tx) }] };
    },
  });

  api.registerTool({
    name: "get_transaction_receipt",
    description: "Get the receipt (status, gas used, logs) of a transaction",
    parameters: {
      type: "object",
      properties: {
        txHash: { type: "string", description: "Transaction hash (0x-prefixed)" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["txHash"],
    },
    async execute(params: { txHash: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const receipt = await getTransactionReceipt(params.txHash as `0x${string}`, chainId);
      return { content: [{ type: "text", text: formatJson(receipt) }] };
    },
  });

  api.registerTool({
    name: "estimate_gas",
    description: "Estimate gas cost for a transaction",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Destination address" },
        value: { type: "string", description: "Value in wei (optional)" },
        data: { type: "string", description: "Transaction data (hex, optional)" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["to"],
    },
    async execute(params: { to: string; value?: string; data?: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const result = await estimateGas(
        {
          to: params.to,
          value: params.value ? BigInt(params.value) : undefined,
          data: params.data as `0x${string}` | undefined,
        },
        chainId,
      );
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  });
}
