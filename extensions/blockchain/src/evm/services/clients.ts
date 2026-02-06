import {
  type Account,
  type Chain,
  type PublicClient,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getChain, getRpcUrl } from "../chains.js";

const publicClients = new Map<number, PublicClient>();

/** Get or create a cached public client for the given chain. */
export function getPublicClient(chainId: number): PublicClient {
  const existing = publicClients.get(chainId);
  if (existing) return existing;

  const chain = getChain(chainId);
  const rpcUrl = getRpcUrl(chainId);
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  publicClients.set(chainId, client);
  return client;
}

/** Create a wallet client for signing transactions. */
export function getWalletClient(chainId: number, privateKey: `0x${string}`): WalletClient {
  const chain = getChain(chainId);
  const rpcUrl = getRpcUrl(chainId);
  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });
}

/** Derive an Ethereum address from a private key. */
export function getAddressFromPrivateKey(privateKey: `0x${string}`): `0x${string}` {
  const account = privateKeyToAccount(privateKey);
  return account.address;
}
