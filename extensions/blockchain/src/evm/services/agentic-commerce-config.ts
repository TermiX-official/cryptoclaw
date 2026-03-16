/**
 * ERC-8183 Agentic Commerce — contract addresses and chain support.
 *
 * Reference deployment on Base Mainnet (USDC as payment token).
 * See: https://eips.ethereum.org/EIPS/eip-8183
 */

// --- Contract Addresses ---

/** ACPCore on Base Mainnet. */
const BASE_MAINNET_ACP = "0x16213AB6a660A24f36d4F8DdACA7a3d0856A8AF5" as const;

/** ACPCore on Base Sepolia (testnet). */
const BASE_SEPOLIA_ACP = "0x16213AB6a660A24f36d4F8DdACA7a3d0856A8AF5" as const;

// --- Payment tokens ---

/** USDC on Base Mainnet. */
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

/** USDC on Base Sepolia. */
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

// --- Supported chains ---

/** Chain config for ERC-8183 deployments. */
type Erc8183ChainConfig = {
  acpAddress: `0x${string}`;
  paymentToken: `0x${string}`;
  paymentSymbol: string;
  paymentDecimals: number;
};

const CHAIN_CONFIGS = new Map<number, Erc8183ChainConfig>([
  [
    8453, // Base Mainnet
    {
      acpAddress: BASE_MAINNET_ACP,
      paymentToken: BASE_MAINNET_USDC,
      paymentSymbol: "USDC",
      paymentDecimals: 6,
    },
  ],
  [
    84532, // Base Sepolia
    {
      acpAddress: BASE_SEPOLIA_ACP,
      paymentToken: BASE_SEPOLIA_USDC,
      paymentSymbol: "USDC",
      paymentDecimals: 6,
    },
  ],
]);

/** Check if a chain has ERC-8183 ACP deployment. */
export function isErc8183Supported(chainId: number): boolean {
  return CHAIN_CONFIGS.has(chainId);
}

/** Get the ACPCore contract address for a chain. */
export function getAcpAddress(chainId: number): `0x${string}` {
  const config = CHAIN_CONFIGS.get(chainId);
  if (!config) {
    throw new Error(
      `ERC-8183 not deployed on chain ${chainId}. Supported: ${[...CHAIN_CONFIGS.keys()].join(", ")} (Base Mainnet, Base Sepolia)`,
    );
  }
  return config.acpAddress;
}

/** Get the payment token config for a chain. */
export function getPaymentConfig(chainId: number): {
  token: `0x${string}`;
  symbol: string;
  decimals: number;
} {
  const config = CHAIN_CONFIGS.get(chainId);
  if (!config) {
    throw new Error(`ERC-8183 not deployed on chain ${chainId}.`);
  }
  return {
    token: config.paymentToken,
    symbol: config.paymentSymbol,
    decimals: config.paymentDecimals,
  };
}

/** Get all supported chain IDs. */
export function getErc8183SupportedChains(): number[] {
  return [...CHAIN_CONFIGS.keys()];
}
