import { type Address, getAddress, isAddress } from "viem";
import { normalize } from "viem/ens";
import { getPublicClient } from "./clients.js";

/**
 * Resolve an ENS name to an address, or validate a raw address.
 * ENS resolution requires Ethereum mainnet (chain 1).
 */
export async function resolveAddress(addressOrEns: string, chainId = 1): Promise<Address> {
  const trimmed = addressOrEns.trim();

  if (isAddress(trimmed)) {
    return getAddress(trimmed);
  }

  // Treat as ENS name — resolve via mainnet
  const client = getPublicClient(1);
  const resolved = await client.getEnsAddress({
    name: normalize(trimmed),
  });

  if (!resolved) {
    throw new Error(`Could not resolve ENS name: ${trimmed}`);
  }

  return resolved;
}
