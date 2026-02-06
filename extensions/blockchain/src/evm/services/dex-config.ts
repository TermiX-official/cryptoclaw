import { mainnet, bsc, polygon, arbitrum, optimism, base } from "viem/chains";

// --- Types ---

export type DexV2Config = {
  name: string;
  routerAddress: `0x${string}`;
  wrappedNative: `0x${string}`;
};

export type DexV3Config = {
  name: string;
  swapRouterAddress: `0x${string}`;
  quoterAddress: `0x${string}`;
  wrappedNative: `0x${string}`;
  defaultFeeTier: number;
};

export type ChainDexConfig = {
  v2?: DexV2Config;
  v3?: DexV3Config;
};

// --- V3 Fee Tiers ---

/** Standard Uniswap V3 fee tiers in hundredths of a bip (1 = 0.01%). */
export const FEE_TIERS = [100, 500, 3000, 10000] as const;
export type FeeTier = (typeof FEE_TIERS)[number];

export const FEE_TIER_LABELS: Record<number, string> = {
  100: "0.01%",
  500: "0.05%",
  3000: "0.3%",
  10000: "1%",
};

// --- Per-chain DEX configuration ---

const DEX_CONFIGS: Record<number, ChainDexConfig> = {
  // BSC — PancakeSwap
  [bsc.id]: {
    v2: {
      name: "PancakeSwap V2",
      routerAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
      wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    },
    v3: {
      name: "PancakeSwap V3",
      swapRouterAddress: "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4",
      quoterAddress: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
      wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      defaultFeeTier: 2500, // PancakeSwap uses 2500 (0.25%) as common tier
    },
  },

  // Ethereum — Uniswap
  [mainnet.id]: {
    v2: {
      name: "Uniswap V2",
      routerAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      wrappedNative: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    },
    v3: {
      name: "Uniswap V3",
      swapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      quoterAddress: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      wrappedNative: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      defaultFeeTier: 3000,
    },
  },

  // Polygon — QuickSwap (V2 fork) + Uniswap V3
  [polygon.id]: {
    v2: {
      name: "QuickSwap V2",
      routerAddress: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
      wrappedNative: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    },
    v3: {
      name: "Uniswap V3",
      swapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      quoterAddress: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      wrappedNative: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      defaultFeeTier: 3000,
    },
  },

  // Arbitrum — Uniswap V2 + V3
  [arbitrum.id]: {
    v2: {
      name: "Uniswap V2",
      routerAddress: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
      wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    },
    v3: {
      name: "Uniswap V3",
      swapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      quoterAddress: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      defaultFeeTier: 3000,
    },
  },

  // Optimism — Uniswap V3 only (no V2 deployment)
  [optimism.id]: {
    v3: {
      name: "Uniswap V3",
      swapRouterAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      quoterAddress: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      wrappedNative: "0x4200000000000000000000000000000000000006", // WETH
      defaultFeeTier: 3000,
    },
  },

  // Base — Uniswap V3 only
  [base.id]: {
    v3: {
      name: "Uniswap V3",
      swapRouterAddress: "0x2626664c2603336E57B271c5C0b26F421741e481",
      quoterAddress: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
      wrappedNative: "0x4200000000000000000000000000000000000006", // WETH
      defaultFeeTier: 3000,
    },
  },
};

// --- Helpers ---

export function getDexConfig(chainId: number): ChainDexConfig {
  const config = DEX_CONFIGS[chainId];
  if (!config) {
    throw new Error(
      `No DEX configuration for chain ${chainId}. Supported: ${Object.keys(DEX_CONFIGS).join(", ")}`,
    );
  }
  return config;
}

export function getWrappedNativeAddress(chainId: number): `0x${string}` {
  const config = getDexConfig(chainId);
  const addr = config.v3?.wrappedNative ?? config.v2?.wrappedNative;
  if (!addr) {
    throw new Error(`No wrapped native token for chain ${chainId}`);
  }
  return addr;
}

/** Check if the given input represents the chain's native token. */
export function isNativeToken(tokenAddress: string): boolean {
  const lower = tokenAddress.toLowerCase();
  return (
    lower === "native" ||
    lower === "eth" ||
    lower === "bnb" ||
    lower === "matic" ||
    lower === "0x0000000000000000000000000000000000000000" ||
    lower === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  );
}

/** List all chain IDs with DEX support. */
export function getSupportedDexChainIds(): number[] {
  return Object.keys(DEX_CONFIGS).map(Number);
}
