import { type Hash, formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { ERC20_ABI } from "./abi/erc20.js";
import { ERC721_ABI } from "./abi/erc721.js";
import { ERC1155_ABI } from "./abi/erc1155.js";
import { getPublicClient, getWalletClient } from "./clients.js";
import { resolveAddress } from "./ens.js";

export type TransferResult = {
  txHash: Hash;
  from: string;
  to: string;
  amount: string;
  symbol: string;
  network: string;
};

/** Transfer native currency (ETH, BNB, MATIC, etc.) */
export async function transferNativeToken(
  privateKey: `0x${string}`,
  toAddressOrEns: string,
  amount: string,
  chainId: number,
): Promise<TransferResult> {
  const walletClient = getWalletClient(chainId, privateKey);
  const to = await resolveAddress(toAddressOrEns, chainId);
  const value = parseEther(amount);

  const hash = await walletClient.sendTransaction({
    to,
    value,
  });

  return {
    txHash: hash,
    from: walletClient.account!.address,
    to,
    amount,
    symbol: walletClient.chain?.nativeCurrency?.symbol ?? "ETH",
    network: walletClient.chain?.name ?? `Chain ${chainId}`,
  };
}

/** Transfer ERC20 tokens */
export async function transferERC20(
  privateKey: `0x${string}`,
  tokenAddress: string,
  toAddressOrEns: string,
  amount: string,
  chainId: number,
): Promise<TransferResult & { tokenName: string }> {
  const client = getPublicClient(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const to = await resolveAddress(toAddressOrEns, chainId);
  const token = await resolveAddress(tokenAddress, chainId);

  const [decimals, symbol, name] = await Promise.all([
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "decimals",
    }) as Promise<number>,
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "symbol",
    }) as Promise<string>,
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "name",
    }) as Promise<string>,
  ]);

  const value = parseUnits(amount, decimals);

  const hash = await walletClient.writeContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to, value],
  });

  return {
    txHash: hash,
    from: walletClient.account!.address,
    to,
    amount,
    symbol,
    tokenName: name,
    network: walletClient.chain?.name ?? `Chain ${chainId}`,
  };
}

/** Approve ERC20 token spending */
export async function approveERC20(
  privateKey: `0x${string}`,
  tokenAddress: string,
  spenderAddressOrEns: string,
  amount: string,
  chainId: number,
): Promise<{ txHash: Hash; token: string; spender: string; amount: string }> {
  const client = getPublicClient(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const spender = await resolveAddress(spenderAddressOrEns, chainId);
  const token = await resolveAddress(tokenAddress, chainId);

  const decimals = (await client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "decimals",
  })) as number;

  const value = parseUnits(amount, decimals);

  const hash = await walletClient.writeContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, value],
  });

  return { txHash: hash, token: tokenAddress, spender, amount };
}

/** Transfer an ERC721 NFT */
export async function transferERC721(
  privateKey: `0x${string}`,
  nftAddress: string,
  toAddressOrEns: string,
  tokenId: bigint,
  chainId: number,
): Promise<{ txHash: Hash; nft: string; tokenId: string; to: string }> {
  const walletClient = getWalletClient(chainId, privateKey);
  const to = await resolveAddress(toAddressOrEns, chainId);
  const nft = await resolveAddress(nftAddress, chainId);

  const hash = await walletClient.writeContract({
    address: nft,
    abi: ERC721_ABI,
    functionName: "transferFrom",
    args: [walletClient.account!.address, to, tokenId],
  });

  return { txHash: hash, nft: nftAddress, tokenId: tokenId.toString(), to };
}

/** Transfer ERC1155 tokens */
export async function transferERC1155(
  privateKey: `0x${string}`,
  tokenAddress: string,
  toAddressOrEns: string,
  tokenId: bigint,
  amount: bigint,
  chainId: number,
): Promise<{ txHash: Hash; token: string; tokenId: string; amount: string; to: string }> {
  const walletClient = getWalletClient(chainId, privateKey);
  const to = await resolveAddress(toAddressOrEns, chainId);
  const token = await resolveAddress(tokenAddress, chainId);

  const hash = await walletClient.writeContract({
    address: token,
    abi: ERC1155_ABI,
    functionName: "safeTransferFrom",
    args: [walletClient.account!.address, to, tokenId, amount, "0x"],
  });

  return {
    txHash: hash,
    token: tokenAddress,
    tokenId: tokenId.toString(),
    amount: amount.toString(),
    to,
  };
}
