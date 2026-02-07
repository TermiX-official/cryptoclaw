import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import type { Abi } from "viem";
import type { WalletManager } from "../../wallet/wallet-manager.js";
import { resolveActivePrivateKey } from "../../wallet/active-wallet.js";
import { DEFAULT_CHAIN_ID, resolveChainId } from "../chains.js";
import { isContract, readContract, writeContract } from "../services/contracts.js";
import { formatJson } from "../services/utils.js";

export function registerContractTools(api: OpenClawPluginApi, walletManager: WalletManager) {
  api.registerTool({
    name: "read_contract",
    description: "Read data from a smart contract (view/pure function). No gas required.",
    parameters: {
      type: "object",
      properties: {
        contractAddress: { type: "string", description: "Smart contract address" },
        abi: {
          type: "string",
          description: "Contract ABI as JSON string (at minimum the function being called)",
        },
        functionName: { type: "string", description: "Function name to call" },
        args: { type: "string", description: "Function arguments as JSON array string" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["contractAddress", "abi", "functionName"],
    },
    async execute(
      _toolCallId: string,
      params: {
        contractAddress: string;
        abi: string;
        functionName: string;
        args?: string;
        network?: string;
      },
    ) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const abi = JSON.parse(params.abi) as Abi;
      const args = params.args ? JSON.parse(params.args) : [];
      const result = await readContract(
        params.contractAddress,
        abi,
        params.functionName,
        args,
        chainId,
      );
      return { content: [{ type: "text", text: formatJson(result) }] };
    },
  });

  api.registerTool({
    name: "write_contract",
    description:
      "Write to a smart contract (state-changing function). Requires gas. Uses the active wallet.",
    parameters: {
      type: "object",
      properties: {
        contractAddress: { type: "string", description: "Smart contract address" },
        abi: { type: "string", description: "Contract ABI as JSON string" },
        functionName: { type: "string", description: "Function name to call" },
        args: { type: "string", description: "Function arguments as JSON array string" },
        value: {
          type: "string",
          description: "ETH/BNB value to send with the transaction (in wei)",
        },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["contractAddress", "abi", "functionName"],
    },
    async execute(
      _toolCallId: string,
      params: {
        contractAddress: string;
        abi: string;
        functionName: string;
        args?: string;
        value?: string;
        network?: string;
      },
    ) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const privateKey = await resolveActivePrivateKey(walletManager);
      const abi = JSON.parse(params.abi) as Abi;
      const args = params.args ? JSON.parse(params.args) : [];
      const value = params.value ? BigInt(params.value) : undefined;
      const txHash = await writeContract(
        privateKey,
        params.contractAddress,
        abi,
        params.functionName,
        args,
        chainId,
        value,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                txHash,
                functionName: params.functionName,
                contractAddress: params.contractAddress,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  api.registerTool({
    name: "is_contract",
    description: "Check if an address is a smart contract (has deployed code)",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string", description: "Address to check" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
      required: ["address"],
    },
    async execute(_toolCallId: string, params: { address: string; network?: string }) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const result = await isContract(params.address, chainId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ address: params.address, isContract: result }, null, 2),
          },
        ],
      };
    },
  });
}
