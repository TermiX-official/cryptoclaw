import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import { DEFAULT_CHAIN_ID, resolveChainId } from "../chains.js";
import { getBlockByHash, getBlockByNumber, getLatestBlock } from "../services/blocks.js";
import { formatJson } from "../services/utils.js";

export function registerBlockTools(api: OpenClawPluginApi) {
  api.registerTool({
    name: "get_block_info",
    description: "Get information about a specific block by number or hash, or the latest block",
    parameters: {
      type: "object",
      properties: {
        blockNumber: { type: "string", description: "Block number (omit for latest block)" },
        blockHash: { type: "string", description: "Block hash (alternative to blockNumber)" },
        network: { type: "string", description: 'Network name or chain ID (default: "bsc")' },
      },
    },
    async execute(
      _toolCallId: string,
      params: { blockNumber?: string; blockHash?: string; network?: string },
    ) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      let block;
      if (params.blockHash) {
        block = await getBlockByHash(params.blockHash as `0x${string}`, chainId);
      } else if (params.blockNumber) {
        block = await getBlockByNumber(BigInt(params.blockNumber), chainId);
      } else {
        block = await getLatestBlock(chainId);
      }
      return { content: [{ type: "text", text: formatJson(block) }] };
    },
  });
}
