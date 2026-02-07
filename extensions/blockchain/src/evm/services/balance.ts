import { formatEther, formatUnits } from "viem";
import { ERC20_ABI } from "./abi/erc20.js";
import { getPublicClient } from "./clients.js";
import { resolveAddress } from "./ens.js";

export type BalanceResult = {
  address: string;
  balance: string;
  balanceRaw: string;
  symbol: string;
  network: string;
};

/** Get native currency balance (ETH, BNB, MATIC, etc.) */
export async function getNativeBalance(
  addressOrEns: string,
  chainId: number,
): Promise<BalanceResult> {
  const client = getPublicClient(chainId);
  const address = await resolveAddress(addressOrEns, chainId);
  const balance = await client.getBalance({ address });
  const chain = client.chain;

  return {
    address,
    balance: formatEther(balance),
    balanceRaw: balance.toString(),
    symbol: chain?.nativeCurrency?.symbol ?? "ETH",
    network: chain?.name ?? `Chain ${chainId}`,
  };
}

/** Get ERC20 token balance */
export async function getERC20Balance(
  addressOrEns: string,
  tokenAddress: string,
  chainId: number,
): Promise<BalanceResult & { decimals: number; tokenName: string }> {
  const client = getPublicClient(chainId);
  const address = await resolveAddress(addressOrEns, chainId);
  const token = await resolveAddress(tokenAddress, chainId);

  const [balance, decimals, symbol, name] = await Promise.all([
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }),
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "symbol",
    }),
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "name",
    }),
  ]);

  return {
    address,
    balance: formatUnits(balance, decimals),
    balanceRaw: balance.toString(),
    symbol,
    tokenName: name,
    decimals,
    network: client.chain?.name ?? `Chain ${chainId}`,
  };
}
