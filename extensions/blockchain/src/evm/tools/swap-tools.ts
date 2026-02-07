import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import type { WalletManager } from "../../wallet/wallet-manager.js";
import { resolveActivePrivateKey } from "../../wallet/active-wallet.js";
import { DEFAULT_CHAIN_ID, resolveChainId } from "../chains.js";
import { getChain } from "../chains.js";
import {
  getDexConfig,
  FEE_TIERS,
  FEE_TIER_LABELS,
  getSupportedDexChainIds,
} from "../services/dex-config.js";
import { getSwapQuote, executeSwap, checkRouterAllowance } from "../services/swap.js";

export function registerSwapTools(api: OpenClawPluginApi, walletManager: WalletManager) {
  api.registerTool({
    name: "swap_get_quote",
    description:
      "Get a DEX swap quote. Compares Uniswap/PancakeSwap V2 and V3, returns the best price. " +
      'Use "native" for ETH/BNB/MATIC.',
    parameters: {
      type: "object",
      properties: {
        tokenIn: {
          type: "string",
          description:
            'Input token address, or "native" for the chain\'s native currency (ETH, BNB, etc.)',
        },
        tokenOut: {
          type: "string",
          description: 'Output token address, or "native"',
        },
        amountIn: {
          type: "string",
          description: 'Amount of input token to swap (e.g. "1.5")',
        },
        slippage: {
          type: "number",
          description: "Slippage tolerance in percent (default: 0.5)",
        },
        preferVersion: {
          type: "string",
          description: 'Force "v2" or "v3". Omit to auto-select the best quote.',
        },
        feeTier: {
          type: "number",
          description:
            "V3 fee tier: 100 (0.01%), 500 (0.05%), 3000 (0.3%), 10000 (1%). Default: auto.",
        },
        network: {
          type: "string",
          description: 'Network name or chain ID (default: "bsc")',
        },
      },
      required: ["tokenIn", "tokenOut", "amountIn"],
    },
    async execute(
      _toolCallId: string,
      params: {
        tokenIn: string;
        tokenOut: string;
        amountIn: string;
        slippage?: number;
        preferVersion?: string;
        feeTier?: number;
        network?: string;
      },
    ) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const slippageBps = params.slippage ? Math.round(params.slippage * 100) : undefined;
      const preferVersion = params.preferVersion as "v2" | "v3" | undefined;

      const quote = await getSwapQuote(params.tokenIn, params.tokenOut, params.amountIn, chainId, {
        slippageBps,
        preferVersion,
        feeTier: params.feeTier,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                dex: quote.dex,
                version: quote.version,
                tokenIn: `${quote.tokenIn.symbol} (${quote.tokenIn.address})`,
                tokenOut: `${quote.tokenOut.symbol} (${quote.tokenOut.address})`,
                amountIn: `${quote.amountIn} ${quote.tokenIn.symbol}`,
                estimatedOutput: `${quote.amountOut} ${quote.tokenOut.symbol}`,
                minimumOutput: `${quote.amountOutMin} ${quote.tokenOut.symbol}`,
                slippage: `${quote.slippageBps / 100}%`,
                feeTier: quote.feeTier
                  ? (FEE_TIER_LABELS[quote.feeTier] ?? `${quote.feeTier}`)
                  : "N/A (V2)",
                network: quote.network,
                router: quote.routerAddress,
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
    name: "swap_execute",
    description:
      "Execute a token swap on a DEX using the active wallet. Automatically approves token spending if needed. " +
      "ALWAYS get a quote first with swap_get_quote before executing.",
    parameters: {
      type: "object",
      properties: {
        tokenIn: {
          type: "string",
          description: 'Input token address, or "native"',
        },
        tokenOut: {
          type: "string",
          description: 'Output token address, or "native"',
        },
        amountIn: {
          type: "string",
          description: "Amount of input token to swap",
        },
        slippage: {
          type: "number",
          description: "Slippage tolerance in percent (default: 0.5)",
        },
        preferVersion: {
          type: "string",
          description: 'Force "v2" or "v3". Omit to auto-select.',
        },
        feeTier: {
          type: "number",
          description: "V3 fee tier (default: auto)",
        },
        deadline: {
          type: "number",
          description: "Transaction deadline in seconds from now (default: 1200 = 20 minutes)",
        },
        network: {
          type: "string",
          description: 'Network name or chain ID (default: "bsc")',
        },
      },
      required: ["tokenIn", "tokenOut", "amountIn"],
    },
    async execute(
      _toolCallId: string,
      params: {
        tokenIn: string;
        tokenOut: string;
        amountIn: string;
        slippage?: number;
        preferVersion?: string;
        feeTier?: number;
        deadline?: number;
        network?: string;
      },
    ) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const slippageBps = params.slippage ? Math.round(params.slippage * 100) : undefined;
      const preferVersion = params.preferVersion as "v2" | "v3" | undefined;
      const privateKey = await resolveActivePrivateKey(walletManager);

      // Get fresh quote
      const quote = await getSwapQuote(params.tokenIn, params.tokenOut, params.amountIn, chainId, {
        slippageBps,
        preferVersion,
        feeTier: params.feeTier,
      });

      // Execute
      const result = await executeSwap(privateKey, quote, params.deadline);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "success",
                txHash: result.txHash,
                dex: result.dex,
                version: result.version,
                swapped: `${result.amountIn} ${result.tokenIn} → ~${result.expectedAmountOut} ${result.tokenOut}`,
                network: result.network,
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
    name: "swap_check_allowance",
    description:
      "Check if a token is approved for the DEX router. Useful before swapping to see if an approval transaction is needed.",
    parameters: {
      type: "object",
      properties: {
        tokenAddress: {
          type: "string",
          description: "ERC20 token contract address to check",
        },
        network: {
          type: "string",
          description: 'Network name or chain ID (default: "bsc")',
        },
        version: {
          type: "string",
          description: 'Check allowance for "v2" or "v3" router (default: v3 if available)',
        },
      },
      required: ["tokenAddress"],
    },
    async execute(
      _toolCallId: string,
      params: { tokenAddress: string; network?: string; version?: string },
    ) {
      const chainId = params.network ? resolveChainId(params.network) : DEFAULT_CHAIN_ID;
      const address = walletManager.getActiveAddress();
      if (!address) {
        throw new Error("No active wallet");
      }

      const result = await checkRouterAllowance(
        address,
        params.tokenAddress,
        chainId,
        params.version as "v2" | "v3" | undefined,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                token: params.tokenAddress,
                allowance: result.allowance,
                routerAddress: result.routerAddress,
                routerVersion: result.version,
                network: getChain(chainId).name,
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
    name: "swap_supported_dexes",
    description: "List available DEXes, supported versions (V2/V3), and fee tiers for a network.",
    parameters: {
      type: "object",
      properties: {
        network: {
          type: "string",
          description: 'Network name or chain ID (default: "bsc")',
        },
      },
    },
    async execute(_toolCallId: string, params: { network?: string }) {
      if (params.network) {
        const chainId = resolveChainId(params.network);
        const config = getDexConfig(chainId);
        const chain = getChain(chainId);

        const result: Record<string, unknown> = { network: chain.name, chainId };
        if (config.v2) {
          result.v2 = {
            dex: config.v2.name,
            router: config.v2.routerAddress,
          };
        }
        if (config.v3) {
          result.v3 = {
            dex: config.v3.name,
            swapRouter: config.v3.swapRouterAddress,
            quoter: config.v3.quoterAddress,
            feeTiers: FEE_TIERS.map((t) => ({ tier: t, label: FEE_TIER_LABELS[t] })),
            defaultFeeTier:
              FEE_TIER_LABELS[config.v3.defaultFeeTier] ?? `${config.v3.defaultFeeTier}`,
          };
        }
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // List all supported chains
      const chainIds = getSupportedDexChainIds();
      const networks = chainIds.map((id) => {
        const config = getDexConfig(id);
        const chain = getChain(id);
        return {
          network: chain.name,
          chainId: id,
          v2: config.v2?.name ?? null,
          v3: config.v3?.name ?? null,
        };
      });

      return { content: [{ type: "text", text: JSON.stringify(networks, null, 2) }] };
    },
  });
}
