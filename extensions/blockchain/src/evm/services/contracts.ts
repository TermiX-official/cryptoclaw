import type { Abi, Hash } from "viem";
import { getPublicClient, getWalletClient } from "./clients.js";
import { resolveAddress } from "./ens.js";

/** Read from a smart contract (view/pure function) */
export async function readContract(
  contractAddress: string,
  abi: Abi,
  functionName: string,
  args: unknown[],
  chainId: number,
): Promise<unknown> {
  const client = getPublicClient(chainId);
  const address = await resolveAddress(contractAddress, chainId);

  return client.readContract({
    address,
    abi,
    functionName,
    args,
  });
}

/** Write to a smart contract (state-changing function) */
export async function writeContract(
  privateKey: `0x${string}`,
  contractAddress: string,
  abi: Abi,
  functionName: string,
  args: unknown[],
  chainId: number,
  value?: bigint,
): Promise<Hash> {
  const walletClient = getWalletClient(chainId, privateKey);
  const address = await resolveAddress(contractAddress, chainId);

  return walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
    value,
  });
}

/** Check if an address is a contract */
export async function isContract(addressOrEns: string, chainId: number): Promise<boolean> {
  const client = getPublicClient(chainId);
  const address = await resolveAddress(addressOrEns, chainId);
  const code = await client.getCode({ address });
  return !!code && code !== "0x";
}
