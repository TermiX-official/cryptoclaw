import {
  type Chain,
  arbitrum,
  arbitrumSepolia,
  base,
  baseSepolia,
  bsc,
  bscTestnet,
  iotex,
  iotexTestnet,
  mainnet,
  opBNB,
  opBNBTestnet,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  sepolia,
} from "viem/chains";

/** Chain ID -> viem Chain object */
export const chainMap = new Map<number, Chain>([
  [mainnet.id, mainnet],
  [sepolia.id, sepolia],
  [bsc.id, bsc],
  [bscTestnet.id, bscTestnet],
  [opBNB.id, opBNB],
  [opBNBTestnet.id, opBNBTestnet],
  [polygon.id, polygon],
  [polygonAmoy.id, polygonAmoy],
  [arbitrum.id, arbitrum],
  [arbitrumSepolia.id, arbitrumSepolia],
  [optimism.id, optimism],
  [optimismSepolia.id, optimismSepolia],
  [base.id, base],
  [baseSepolia.id, baseSepolia],
  [iotex.id, iotex],
  [iotexTestnet.id, iotexTestnet],
]);

/** Human-friendly network name -> chain ID */
export const networkNameMap = new Map<string, number>([
  ["ethereum", mainnet.id],
  ["eth", mainnet.id],
  ["mainnet", mainnet.id],
  ["sepolia", sepolia.id],
  ["bsc", bsc.id],
  ["bnb", bsc.id],
  ["bsc-testnet", bscTestnet.id],
  ["opbnb", opBNB.id],
  ["opbnb-testnet", opBNBTestnet.id],
  ["polygon", polygon.id],
  ["polygon-amoy", polygonAmoy.id],
  ["arbitrum", arbitrum.id],
  ["arbitrum-sepolia", arbitrumSepolia.id],
  ["optimism", optimism.id],
  ["optimism-sepolia", optimismSepolia.id],
  ["base", base.id],
  ["base-sepolia", baseSepolia.id],
  ["iotex", iotex.id],
  ["iotex-testnet", iotexTestnet.id],
]);

/** Optional custom RPC overrides (chain ID -> URL). Users can set via config. */
export const rpcUrlMap = new Map<number, string>();

/** Resolve a network name or chain ID string to a numeric chain ID. */
export function resolveChainId(networkOrId: string): number {
  const asNumber = Number(networkOrId);
  if (!Number.isNaN(asNumber) && chainMap.has(asNumber)) {
    return asNumber;
  }
  const normalized = networkOrId.toLowerCase().trim();
  const id = networkNameMap.get(normalized);
  if (id !== undefined) {
    return id;
  }
  throw new Error(
    `Unknown network "${networkOrId}". Supported: ${[...networkNameMap.keys()].join(", ")}`,
  );
}

/** Get a viem Chain by chain ID. */
export function getChain(chainId: number): Chain {
  const chain = chainMap.get(chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return chain;
}

/** Get the RPC URL for a chain (custom override or default). */
export function getRpcUrl(chainId: number): string | undefined {
  return rpcUrlMap.get(chainId);
}

/** List all supported networks with metadata. */
export function getSupportedNetworks(): Array<{
  name: string;
  chainId: number;
  isTestnet: boolean;
  nativeCurrency: string;
}> {
  const seen = new Set<number>();
  const results: Array<{
    name: string;
    chainId: number;
    isTestnet: boolean;
    nativeCurrency: string;
  }> = [];

  for (const [name, chainId] of networkNameMap) {
    if (seen.has(chainId)) continue;
    seen.add(chainId);
    const chain = chainMap.get(chainId);
    if (!chain) continue;
    results.push({
      name,
      chainId,
      isTestnet: chain.testnet === true,
      nativeCurrency: chain.nativeCurrency.symbol,
    });
  }
  return results;
}

/** Default network (BSC unless overridden via config). */
export let DEFAULT_CHAIN_ID: number = bsc.id;

/** Override the default chain ID. Throws if the chain is not in `chainMap`. */
export function setDefaultChainId(id: number): void {
  if (!chainMap.has(id)) throw new Error(`Unsupported chain ID: ${id}`);
  DEFAULT_CHAIN_ID = id;
}

/** Human-readable name for the current default chain (reverse-lookup from networkNameMap). */
export function getDefaultChainName(): string {
  for (const [name, id] of networkNameMap) {
    if (id === DEFAULT_CHAIN_ID) return name.toUpperCase();
  }
  return String(DEFAULT_CHAIN_ID);
}
