import type { OpenClawPluginApi, OpenClawPluginDefinition } from "cryptoclaw/plugin-sdk";
import { getDefaultChainName, resolveChainId, setDefaultChainId } from "./src/evm/chains.js";
import { registerBlockTools } from "./src/evm/tools/block-tools.js";
import { registerContractTools } from "./src/evm/tools/contract-tools.js";
import { registerIdentityTools } from "./src/evm/tools/identity-tools.js";
import { registerNetworkTools } from "./src/evm/tools/network-tools.js";
import { registerNftTools } from "./src/evm/tools/nft-tools.js";
import { registerSwapTools } from "./src/evm/tools/swap-tools.js";
import { registerTokenTools } from "./src/evm/tools/token-tools.js";
import { registerTxTools } from "./src/evm/tools/tx-tools.js";
import { registerWalletTools } from "./src/evm/tools/wallet-tools.js";
import { requiresConfirmation, formatConfirmationPrompt } from "./src/tx-gate/confirmation.js";
import { SpendingTracker, DEFAULT_SPENDING_LIMITS } from "./src/tx-gate/spending-limits.js";
import { sanitizeSecrets, KEY_GUARD_SYSTEM_PROMPT } from "./src/wallet/key-guard.js";
import { WalletManager } from "./src/wallet/wallet-manager.js";

const blockchainPlugin: OpenClawPluginDefinition = {
  id: "blockchain",
  name: "Blockchain",
  description:
    "EVM blockchain tools: wallet management, token transfers, DEX swaps (Uniswap/PancakeSwap V2+V3), NFTs, smart contracts, ERC-8004 agent identity, and multi-chain operations",

  register(api: OpenClawPluginApi) {
    const stateDir = api.runtime.state.resolveStateDir();
    const walletManager = new WalletManager(stateDir);
    const spendingTracker = new SpendingTracker(stateDir);

    // Read plugin config for spending limits
    const pluginConfig = (api.pluginConfig ?? {}) as Record<string, unknown>;
    const spendingLimits = {
      ...DEFAULT_SPENDING_LIMITS,
      ...((pluginConfig.spendingLimits as Record<string, unknown>) ?? {}),
    };

    // Apply configured default chain (if any)
    const defaultChainStr = pluginConfig.defaultChain as string | undefined;
    if (defaultChainStr) {
      try {
        setDefaultChainId(resolveChainId(defaultChainStr));
      } catch {
        api.logger.warn(`[blockchain] Unknown defaultChain "${defaultChainStr}", keeping BSC`);
      }
    }

    // --- Register all tools ---
    registerWalletTools(api, walletManager);
    registerTokenTools(api, walletManager);
    registerNftTools(api, walletManager);
    registerContractTools(api, walletManager);
    registerBlockTools(api);
    registerTxTools(api, walletManager);
    registerNetworkTools(api);
    registerSwapTools(api, walletManager);
    registerIdentityTools(api, walletManager);

    // --- Transaction confirmation hook ---
    api.on("before_tool_call", async (event) => {
      if (!requiresConfirmation(event.toolName)) {
        return;
      }
      // The agent's system prompt instructs it to confirm with the user.
      // This hook provides the formatted summary for the agent to present.
      const summary = formatConfirmationPrompt(event.toolName, event.params);
      api.logger.info(`[tx-gate] Pending confirmation: ${summary}`);
      return undefined;
    });

    // --- Spending tracking hook ---
    api.on("after_tool_call", async (event) => {
      if (!requiresConfirmation(event.toolName) || event.error) {
        return;
      }
      // Log successful state-changing operations
      spendingTracker.logSpend({
        timestamp: new Date().toISOString(),
        toolName: event.toolName,
        valueUsd: 0, // USD value would require price oracle integration
        network: (event.params.network as string) ?? "bsc",
        txHash: (event.result as { txHash?: string })?.txHash,
      });
    });

    // --- Layer 3: Sanitize ALL tool results before persisting to session ---
    // Applies to every tool, not just wallet ones — defense in depth.
    api.on("tool_result_persist", (event) => {
      const msg = { ...event.message };
      if (typeof msg.content === "string") {
        const sanitized = sanitizeSecrets(msg.content);
        if (sanitized !== msg.content) {
          return { message: { ...msg, content: sanitized } };
        }
      }
      return undefined;
    });

    // --- Layer 4: Sanitize outbound messages to channels ---
    // Catches any private key that the agent might include in its response
    // before it reaches Discord, Telegram, WhatsApp, etc.
    api.on("message_sending", (event) => {
      if (!event.content) return undefined;
      const sanitized = sanitizeSecrets(event.content);
      if (sanitized !== event.content) {
        api.logger.warn("[key-guard] Blocked private key leak in outbound message");
        return { content: sanitized };
      }
      return undefined;
    });

    // --- CLI commands ---
    api.registerCli(
      (ctx) => {
        const wallet = ctx.program.command("wallet").description("Manage blockchain wallets");

        wallet
          .command("create")
          .option("--label <name>", "Wallet label", "Default")
          .description("Create a new wallet")
          .action(async (opts: { label: string }) => {
            const { password } = (await import("@clack/prompts").then((m) =>
              m.password({ message: "Enter a passphrase to encrypt your wallet:" }),
            )) as { password: string };
            if (!password) return;
            const w = await walletManager.createWallet(opts.label, password as string);
            console.log(`Wallet created: ${w.label} (${w.address})`);
          });

        wallet
          .command("import")
          .option("--label <name>", "Wallet label", "Imported")
          .description("Import an existing private key")
          .action(async (opts: { label: string }) => {
            const prompts = await import("@clack/prompts");
            const key = await prompts.password({ message: "Enter private key (0x...):" });
            const pass = await prompts.password({ message: "Enter passphrase:" });
            if (!key || !pass) return;
            const w = await walletManager.importWallet(
              key as `0x${string}`,
              opts.label,
              pass as string,
            );
            console.log(`Wallet imported: ${w.label} (${w.address})`);
          });

        wallet
          .command("list")
          .description("List all wallets")
          .action(() => {
            const { wallets, activeWalletId } = walletManager.listWallets();
            if (wallets.length === 0) {
              console.log("No wallets. Create one with: cryptoclaw wallet create");
              return;
            }
            for (const w of wallets) {
              const active = w.id === activeWalletId ? " [ACTIVE]" : "";
              console.log(`  ${w.label}: ${w.address}${active}`);
            }
          });

        wallet
          .command("switch <idOrLabel>")
          .description("Switch the active wallet")
          .action((idOrLabel: string) => {
            const w = walletManager.switchWallet(idOrLabel);
            console.log(`Active wallet: ${w.label} (${w.address})`);
          });

        wallet
          .command("delete <idOrLabel>")
          .description("Delete a wallet")
          .action(async (idOrLabel: string) => {
            const { password } = (await import("@clack/prompts").then((m) =>
              m.password({ message: "Enter passphrase to confirm:" }),
            )) as { password: string };
            if (!password) return;
            await walletManager.deleteWallet(idOrLabel, password as string);
            console.log(`Wallet "${idOrLabel}" deleted.`);
          });

        wallet
          .command("export <idOrLabel>")
          .description("Export a wallet private key (for backup)")
          .action(async (idOrLabel: string) => {
            const { password } = (await import("@clack/prompts").then((m) =>
              m.password({ message: "Enter passphrase:" }),
            )) as { password: string };
            if (!password) return;
            const key = await walletManager.exportWallet(idOrLabel, password as string);
            console.log(`Private key: ${key}`);
            console.log("WARNING: Store this key securely. Do not share it.");
          });
      },
      { commands: ["wallet"] },
    );

    // --- Layer 5: System prompt — instruct agent to never handle keys ---
    api.on("before_agent_start", () => {
      const activeAddress = walletManager.getActiveAddress();
      const { wallets } = walletManager.listWallets();
      const walletContext = activeAddress
        ? `Active wallet: ${activeAddress} (${wallets.length} total wallets)`
        : "No wallets configured. Suggest creating one with wallet_create.";

      return {
        prependContext: [
          `[Blockchain] ${walletContext}`,
          `Default network: ${getDefaultChainName()}. Supported: ethereum, bsc, polygon, arbitrum, optimism, base, opbnb, iotex (+ testnets).`,
          "Wallet import/export: CLI-only (`cryptoclaw wallet import`, `cryptoclaw wallet export`). Do NOT attempt these as agent tools.",
          "",
          KEY_GUARD_SYSTEM_PROMPT,
        ].join("\n"),
      };
    });
  },
};

export default blockchainPlugin;
