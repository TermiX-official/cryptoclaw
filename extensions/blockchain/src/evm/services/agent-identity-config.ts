/**
 * ERC-8004 Agent Identity — contract addresses and chain support.
 *
 * Deployed as singletons via the Trustless Agents standard.
 * See: https://eips.ethereum.org/EIPS/eip-8004
 */

// --- Contract Addresses ---

const MAINNET_IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;
const MAINNET_REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as const;
const TESTNET_IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;
const TESTNET_REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as const;

// --- Supported chains ---

/** Mainnet chain IDs with ERC-8004 registry deployments. */
export const ERC8004_MAINNET_CHAINS = [
  1, // Ethereum
  56, // BSC
  8453, // Base
  137, // Polygon
  42161, // Arbitrum
  100, // Gnosis
  42220, // Celo
  534352, // Scroll
  167000, // Taiko
  143, // Monad
] as const;

/** Testnet chain IDs with ERC-8004 registry deployments. */
export const ERC8004_TESTNET_CHAINS = [
  11155111, // Sepolia
  97, // BSC Testnet
  84532, // Base Sepolia
  80002, // Polygon Amoy
  421614, // Arbitrum Sepolia
  44787, // Celo Alfajores
  534351, // Scroll Sepolia
  10143, // Monad Testnet
] as const;

const MAINNET_SET = new Set<number>(ERC8004_MAINNET_CHAINS);
const TESTNET_SET = new Set<number>(ERC8004_TESTNET_CHAINS);

/** Check if a chain ID has ERC-8004 registry deployments. */
export function isErc8004Supported(chainId: number): boolean {
  return MAINNET_SET.has(chainId) || TESTNET_SET.has(chainId);
}

/** Get the Identity Registry address for a chain. */
export function getIdentityRegistryAddress(chainId: number): `0x${string}` {
  if (MAINNET_SET.has(chainId)) return MAINNET_IDENTITY_REGISTRY;
  if (TESTNET_SET.has(chainId)) return TESTNET_IDENTITY_REGISTRY;
  throw new Error(
    `ERC-8004 not supported on chain ${chainId}. Supported mainnet: ${ERC8004_MAINNET_CHAINS.join(", ")}; testnet: ${ERC8004_TESTNET_CHAINS.join(", ")}`,
  );
}

/** Get the Reputation Registry address for a chain. */
export function getReputationRegistryAddress(chainId: number): `0x${string}` {
  if (MAINNET_SET.has(chainId)) return MAINNET_REPUTATION_REGISTRY;
  if (TESTNET_SET.has(chainId)) return TESTNET_REPUTATION_REGISTRY;
  throw new Error(
    `ERC-8004 not supported on chain ${chainId}. Supported mainnet: ${ERC8004_MAINNET_CHAINS.join(", ")}; testnet: ${ERC8004_TESTNET_CHAINS.join(", ")}`,
  );
}
