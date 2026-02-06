import { getPublicClient } from "./clients.js";

/** Get the current block number */
export async function getBlockNumber(chainId: number): Promise<bigint> {
  const client = getPublicClient(chainId);
  return client.getBlockNumber();
}

/** Get block by number */
export async function getBlockByNumber(blockNumber: bigint, chainId: number) {
  const client = getPublicClient(chainId);
  return client.getBlock({ blockNumber });
}

/** Get block by hash */
export async function getBlockByHash(blockHash: `0x${string}`, chainId: number) {
  const client = getPublicClient(chainId);
  return client.getBlock({ blockHash });
}

/** Get the latest block */
export async function getLatestBlock(chainId: number) {
  const client = getPublicClient(chainId);
  return client.getBlock({ blockTag: "latest" });
}
