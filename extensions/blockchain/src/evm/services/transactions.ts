import { formatEther, formatGwei } from "viem";
import { getPublicClient } from "./clients.js";
import { resolveAddress } from "./ens.js";

/** Get transaction by hash */
export async function getTransaction(txHash: `0x${string}`, chainId: number) {
  const client = getPublicClient(chainId);
  return client.getTransaction({ hash: txHash });
}

/** Get transaction receipt */
export async function getTransactionReceipt(txHash: `0x${string}`, chainId: number) {
  const client = getPublicClient(chainId);
  return client.getTransactionReceipt({ hash: txHash });
}

/** Get transaction count (nonce) for an address */
export async function getTransactionCount(addressOrEns: string, chainId: number): Promise<number> {
  const client = getPublicClient(chainId);
  const address = await resolveAddress(addressOrEns, chainId);
  return client.getTransactionCount({ address });
}

/** Estimate gas for a transaction */
export async function estimateGas(
  params: {
    to: string;
    value?: bigint;
    data?: `0x${string}`;
  },
  chainId: number,
): Promise<{ gasEstimate: string; gasPriceGwei: string; estimatedCostEth: string }> {
  const client = getPublicClient(chainId);
  const to = await resolveAddress(params.to, chainId);

  const [gas, gasPrice] = await Promise.all([
    client.estimateGas({ to, value: params.value, data: params.data }),
    client.getGasPrice(),
  ]);

  const estimatedCost = gas * gasPrice;

  return {
    gasEstimate: gas.toString(),
    gasPriceGwei: formatGwei(gasPrice),
    estimatedCostEth: formatEther(estimatedCost),
  };
}

/** Get current chain ID */
export async function getChainId(chainId: number): Promise<number> {
  const client = getPublicClient(chainId);
  return client.getChainId();
}
