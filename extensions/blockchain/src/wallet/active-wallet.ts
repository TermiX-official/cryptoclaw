import type { WalletManager } from "./wallet-manager.js";

/**
 * Resolve the active wallet's private key for tool operations.
 * This is the bridge between the wallet manager and the EVM tools —
 * tools call this instead of requiring users to paste private keys.
 */
export async function resolveActivePrivateKey(
  walletManager: WalletManager,
): Promise<`0x${string}`> {
  if (!walletManager.hasWallets()) {
    throw new Error(
      "No wallets configured. Use `cryptoclaw wallet create` or `cryptoclaw wallet import` first.",
    );
  }

  const address = walletManager.getActiveAddress();
  if (!address) {
    throw new Error(
      "No active wallet selected. Use `cryptoclaw wallet switch <id>` to select one.",
    );
  }

  // Try cached passphrase first, then throw if not available
  const key = await walletManager.getActivePrivateKey();
  return key;
}
