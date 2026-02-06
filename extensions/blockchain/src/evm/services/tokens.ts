import { formatUnits } from "viem";
import { ERC20_ABI } from "./abi/erc20.js";
import { ERC721_ABI } from "./abi/erc721.js";
import { ERC1155_ABI } from "./abi/erc1155.js";
import { getPublicClient } from "./clients.js";
import { resolveAddress } from "./ens.js";

export type ERC20TokenInfo = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
};

/** Get ERC20 token metadata */
export async function getERC20TokenInfo(
  tokenAddress: string,
  chainId: number,
): Promise<ERC20TokenInfo> {
  const client = getPublicClient(chainId);
  const address = await resolveAddress(tokenAddress, chainId);

  // Verify it's a contract
  const code = await client.getCode({ address });
  if (!code || code === "0x") {
    throw new Error(`Address ${tokenAddress} is not a contract on chain ${chainId}`);
  }

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    client.readContract({ address, abi: ERC20_ABI, functionName: "name" }) as Promise<string>,
    client.readContract({ address, abi: ERC20_ABI, functionName: "symbol" }) as Promise<string>,
    client.readContract({ address, abi: ERC20_ABI, functionName: "decimals" }) as Promise<number>,
    client.readContract({
      address,
      abi: ERC20_ABI,
      functionName: "totalSupply",
    }) as Promise<bigint>,
  ]);

  return {
    address,
    name,
    symbol,
    decimals,
    totalSupply: formatUnits(totalSupply, decimals),
  };
}

export type NFTMetadata = {
  address: string;
  name: string;
  symbol: string;
  tokenId: string;
  tokenURI?: string;
  owner?: string;
};

/** Get ERC721 NFT metadata */
export async function getERC721TokenMetadata(
  nftAddress: string,
  tokenId: bigint,
  chainId: number,
): Promise<NFTMetadata> {
  const client = getPublicClient(chainId);
  const address = await resolveAddress(nftAddress, chainId);

  const [name, symbol, tokenURI, owner] = await Promise.all([
    client.readContract({ address, abi: ERC721_ABI, functionName: "name" }) as Promise<string>,
    client.readContract({ address, abi: ERC721_ABI, functionName: "symbol" }) as Promise<string>,
    client
      .readContract({ address, abi: ERC721_ABI, functionName: "tokenURI", args: [tokenId] })
      .catch(() => undefined) as Promise<string | undefined>,
    client
      .readContract({ address, abi: ERC721_ABI, functionName: "ownerOf", args: [tokenId] })
      .catch(() => undefined) as Promise<string | undefined>,
  ]);

  return {
    address,
    name,
    symbol,
    tokenId: tokenId.toString(),
    tokenURI,
    owner,
  };
}

export type ERC1155Metadata = {
  address: string;
  tokenId: string;
  uri?: string;
  name?: string;
};

/** Get ERC1155 token metadata */
export async function getERC1155TokenMetadata(
  tokenAddress: string,
  tokenId: bigint,
  chainId: number,
): Promise<ERC1155Metadata> {
  const client = getPublicClient(chainId);
  const address = await resolveAddress(tokenAddress, chainId);

  const [uri, name] = await Promise.all([
    client
      .readContract({ address, abi: ERC1155_ABI, functionName: "uri", args: [tokenId] })
      .catch(() => undefined) as Promise<string | undefined>,
    client
      .readContract({ address, abi: ERC1155_ABI, functionName: "name" })
      .catch(() => undefined) as Promise<string | undefined>,
  ]);

  return {
    address,
    tokenId: tokenId.toString(),
    uri,
    name,
  };
}
