import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import type { WalletManager } from "../../wallet/wallet-manager.js";

/**
 * Register wallet management tools for the agent.
 *
 * Security design:
 * - wallet_export is CLI-only (not registered here) — private keys never enter agent context
 * - wallet_import is CLI-only — private keys should never be pasted in chat
 * - wallet_create / wallet_delete / wallet_unlock accept passphrase as a tool parameter
 *   so the agent can ask the user in chat (works across gateway/TUI/messaging channels)
 * - Passphrases are listed in SENSITIVE_PARAM_NAMES and stripped from persisted context
 * - Only safe metadata operations (list, switch) need no passphrase
 */
export function registerWalletTools(api: OpenClawPluginApi, walletManager: WalletManager) {
  api.registerTool({
    name: "wallet_create",
    description:
      "Create a new blockchain wallet with a random private key. " +
      "Ask the user for a passphrase in chat, then call this tool with it.",
    parameters: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Human-friendly name for the wallet (e.g. 'Trading', 'Savings')",
        },
        passphrase: {
          type: "string",
          description: "Passphrase to encrypt the wallet (ask the user in chat first)",
        },
      },
      required: ["label", "passphrase"],
    },
    async execute(_toolCallId: string, params: { label: string; passphrase: string }) {
      try {
        const wallet = await walletManager.createWallet(params.label, params.passphrase);
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Failed to create wallet: ${msg}` }],
        };
      }
    },
  });

  // wallet_import is NOT registered as an agent tool.
  // Users must use `cryptoclaw wallet import` in the terminal.
  // This prevents private keys from ever flowing through the agent context.

  api.registerTool({
    name: "wallet_list",
    description: "List all wallets with addresses and labels. Does not expose private keys.",
    parameters: { type: "object", properties: {} },
    async execute(_toolCallId: string) {
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
    async execute(_toolCallId: string, params: { label: string }) {
      try {
        const wallet = walletManager.switchWallet(params.label);
        return {
          content: [
            {
              type: "text",
              text: `Switched to wallet "${wallet.label}" (${wallet.address})`,
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Failed to switch wallet: ${msg}` }],
        };
      }
    },
  });

  api.registerTool({
    name: "wallet_delete",
    description:
      "Delete a wallet permanently. Ask the user for their passphrase in chat to confirm, then call this tool with it.",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string", description: "Wallet label to delete" },
        passphrase: {
          type: "string",
          description: "Wallet passphrase to confirm deletion (ask the user in chat first)",
        },
      },
      required: ["label", "passphrase"],
    },
    async execute(_toolCallId: string, params: { label: string; passphrase: string }) {
      try {
        await walletManager.deleteWallet(params.label, params.passphrase);
        return {
          content: [{ type: "text", text: `Wallet "${params.label}" deleted successfully.` }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Failed to delete wallet: ${msg}` }],
        };
      }
    },
  });

  api.registerTool({
    name: "wallet_unlock",
    description:
      "Unlock the active wallet. Ask the user for their passphrase in chat, then call this tool with it. " +
      "Call this when a transaction fails with 'Passphrase required to unlock wallet'.",
    parameters: {
      type: "object",
      properties: {
        passphrase: {
          type: "string",
          description: "Wallet passphrase (ask the user in chat first)",
        },
      },
      required: ["passphrase"],
    },
    async execute(_toolCallId: string, params: { passphrase: string }) {
      try {
        await walletManager.getActivePrivateKey(params.passphrase);
        return {
          content: [
            {
              type: "text",
              text: "Wallet unlocked successfully. You can now proceed with the transaction.",
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text", text: `Failed to unlock wallet: ${msg}` }],
        };
      }
    },
  });

  // wallet_export is NOT registered as an agent tool.
  // Users must use `cryptoclaw wallet export <label>` in the terminal.
  // This is the most critical security boundary — private keys must NEVER enter agent context.
}
