import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import type { WalletManager } from "../../wallet/wallet-manager.js";

/**
 * Register wallet management tools for the agent.
 *
 * Security design:
 * - wallet_export is CLI-only (not registered here) — private keys never enter agent context
 * - wallet_import is CLI-only — private keys should never be pasted in chat
 * - wallet_create prompts passphrase via terminal, NOT as a tool parameter
 * - wallet_delete prompts passphrase via terminal
 * - Only safe metadata operations (list, switch) are parameter-free
 */
export function registerWalletTools(api: OpenClawPluginApi, walletManager: WalletManager) {
  api.registerTool({
    name: "wallet_create",
    description:
      "Create a new blockchain wallet with a random private key. " +
      "The passphrase will be securely prompted in the user's terminal — do NOT ask for it in chat.",
    parameters: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Human-friendly name for the wallet (e.g. 'Trading', 'Savings')",
        },
      },
      required: ["label"],
    },
    async execute(params: { label: string }) {
      // Passphrase is prompted directly in the terminal — never flows through agent context
      const prompts = await import("@clack/prompts");
      const passphrase = await prompts.password({
        message: "Enter a passphrase to encrypt your new wallet:",
      });
      if (!passphrase || typeof passphrase !== "string") {
        return {
          content: [{ type: "text", text: "Wallet creation cancelled — no passphrase provided." }],
        };
      }
      const confirm = await prompts.password({
        message: "Confirm passphrase:",
      });
      if (confirm !== passphrase) {
        return {
          content: [
            { type: "text", text: "Wallet creation cancelled — passphrases did not match." },
          ],
        };
      }

      const wallet = await walletManager.createWallet(params.label, passphrase);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "Wallet created successfully",
                label: wallet.label,
                address: wallet.address,
                // Intentionally omit: id, privateKey, passphrase
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // wallet_import is NOT registered as an agent tool.
  // Users must use `cryptoclaw wallet import` in the terminal.
  // This prevents private keys from ever flowing through the agent context.

  api.registerTool({
    name: "wallet_list",
    description: "List all wallets with addresses and labels. Does not expose private keys.",
    parameters: { type: "object", properties: {} },
    async execute() {
      const { wallets, activeWalletId } = walletManager.listWallets();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                wallets: wallets.map((w) => ({
                  label: w.label,
                  address: w.address,
                  isActive: w.id === activeWalletId,
                  createdAt: w.createdAt,
                  // Intentionally omit: id (internal detail)
                })),
                total: wallets.length,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  api.registerTool({
    name: "wallet_switch",
    description: "Switch the active wallet used for blockchain operations",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string", description: "Wallet label to switch to" },
      },
      required: ["label"],
    },
    async execute(params: { label: string }) {
      const wallet = walletManager.switchWallet(params.label);
      return {
        content: [
          {
            type: "text",
            text: `Switched to wallet "${wallet.label}" (${wallet.address})`,
          },
        ],
      };
    },
  });

  api.registerTool({
    name: "wallet_delete",
    description:
      "Delete a wallet permanently. The passphrase will be securely prompted in the user's terminal.",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string", description: "Wallet label to delete" },
      },
      required: ["label"],
    },
    async execute(params: { label: string }) {
      const prompts = await import("@clack/prompts");
      const passphrase = await prompts.password({
        message: `Enter passphrase to confirm deletion of wallet "${params.label}":`,
      });
      if (!passphrase || typeof passphrase !== "string") {
        return { content: [{ type: "text", text: "Deletion cancelled." }] };
      }

      await walletManager.deleteWallet(params.label, passphrase);
      return {
        content: [{ type: "text", text: `Wallet "${params.label}" deleted successfully.` }],
      };
    },
  });

  // wallet_export is NOT registered as an agent tool.
  // Users must use `cryptoclaw wallet export <label>` in the terminal.
  // This is the most critical security boundary — private keys must NEVER enter agent context.
}
