import {
  type Hex,
  type PublicClient,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  http,
  serializeTransaction,
} from "viem";
import { privateKeyToAccount, toAccount } from "viem/accounts";
import { getVaultSync } from "../../../../../src/secure-vault/index.js";
import { getChain, getRpcUrl } from "../chains.js";

const publicClients = new Map<number, PublicClient>();

/** Get or create a cached public client for the given chain. */
export function getPublicClient(chainId: number): PublicClient {
  const existing = publicClients.get(chainId);
  if (existing) {
    return existing;
  }

  const chain = getChain(chainId);
  const rpcUrl = getRpcUrl(chainId);
  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  publicClients.set(chainId, client);
  return client;
}

/**
 * Create a wallet client for signing transactions.
 *
 * TEE mode (automatic when TEE is active):
 *   The private key is used ONCE to derive the address, then a custom viem
 *   account is created that delegates all signing to the TEE enclave.
 *   The enclave must have the wallet pre-imported via `import_wallet` RPC.
 *   Signing (signTransaction, signMessage, signTypedData) happens inside
 *   the enclave — the private key never touches viem's signing code.
 *
 * Local mode (fallback):
 *   Standard viem privateKeyToAccount — signs in Node.js process memory.
 */
export function getWalletClient(chainId: number, privateKey: `0x${string}`): WalletClient {
  const chain = getChain(chainId);
  const rpcUrl = getRpcUrl(chainId);
  const vault = getVaultSync();

  // TEE mode: delegate signing to enclave
  if (vault.isTeeEnabled() && vault.signTransaction) {
    const localAccount = privateKeyToAccount(privateKey);
    const address = localAccount.address;

    const teeAccount = toAccount({
      address,

      async signMessage({ message }) {
        // Encode message to signable format
        const msgStr = typeof message === "string" ? message : message.raw.toString();
        const result = await vault.signTransaction!(
          address,
          JSON.stringify({ type: "message", message: msgStr }),
          chainId,
        );
        return result as Hex;
      },

      async signTransaction(transaction, options) {
        const serializer = options?.serializer ?? serializeTransaction;
        const serialized = serializer(transaction);
        const result = await vault.signTransaction!(
          address,
          JSON.stringify({ type: "transaction", serialized }),
          chainId,
        );
        return result as Hex;
      },

      async signTypedData(parameters) {
        const result = await vault.signTransaction!(
          address,
          JSON.stringify({ type: "typedData", ...parameters }),
          chainId,
        );
        return result as Hex;
      },
    });

    return createWalletClient({
      account: teeAccount,
      chain,
      transport: http(rpcUrl),
    });
  }

  // Local mode: sign in-process
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

/**
 * Check if wallet signing should go through TEE.
 * Returns true when TEE is active and supports transaction signing.
 */
export function isTeeSigningAvailable(): boolean {
  const vault = getVaultSync();
  return vault.isTeeEnabled() && typeof vault.signTransaction === "function";
}
