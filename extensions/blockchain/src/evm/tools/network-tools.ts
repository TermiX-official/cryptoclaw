import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import { DEFAULT_CHAIN_ID, getSupportedNetworks, resolveChainId } from "../chains.js";
import { getPublicClient } from "../services/clients.js";

export function registerNetworkTools(api: OpenClawPluginApi) {
  api.registerTool({
    name: "get_supported_networks",
    description: "List all supported blockchain networks with chain IDs and native currencies",
    parameters: { type: "object", properties: {} },
    async execute() {
      const networks = getSupportedNetworks();
      return { content: [{ type: "text", text: JSON.stringify(networks, null, 2) }] };
    },
  });

  api.registerTool({
    name: "get_network_info",
    description:
      "Get information about a specific blockchain network including current block number and gas price",
    parameters: {
      type: "object",
      properties: {
        network: {
          type: "string",
          description: 'Network name or chain ID (e.g., "bsc", "ethereum", "137")',
        },
      },
      required: ["network"],
    },
    async execute(params: { network: string }) {
      const chainId = resolveChainId(params.network);
      const client = getPublicClient(chainId);
      const [blockNumber, gasPrice, chainIdResult] = await Promise.all([
        client.getBlockNumber(),
        client.getGasPrice(),
        client.getChainId(),
      ]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                chainId: chainIdResult,
                network: client.chain?.name,
                blockNumber: blockNumber.toString(),
                gasPrice: `${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`,
                nativeCurrency: client.chain?.nativeCurrency,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });
}
