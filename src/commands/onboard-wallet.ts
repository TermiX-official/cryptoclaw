import type { WizardPrompter } from "../wizard/prompts.js";
import type { OnboardOptions } from "./onboard-types.js";

export type WalletOnboardingResult = {
  action: "created" | "imported" | "skipped" | "kept";
  address?: string;
  label?: string;
};

/**
 * Wallet setup step for the onboarding wizard.
 * Prompts the user to create, import, or skip wallet setup.
 */
export async function setupWallet(
  stateDir: string,
  prompter: WizardPrompter,
  opts: Pick<OnboardOptions, "walletCreate" | "walletImport" | "walletLabel" | "skipWallet">,
): Promise<WalletOnboardingResult> {
  if (opts.skipWallet) {
    return { action: "skipped" };
  }

  // Dynamically import WalletManager to avoid hard dependency on blockchain extension
  // when it's not installed. The extension ships viem as a dependency.
  let WalletManager: typeof import("../../extensions/blockchain/src/wallet/wallet-manager.js").WalletManager;
  try {
    const mod = await import("../../extensions/blockchain/src/wallet/wallet-manager.js");
    WalletManager = mod.WalletManager;
  } catch {
    // Blockchain extension not available — skip wallet setup silently
    await prompter.note(
      "Blockchain extension not installed. Skipping wallet setup.\n" +
        "Install it later and run: cryptoclaw wallet create",
      "Wallet",
    );
    return { action: "skipped" };
  }

  const wm = new WalletManager(stateDir);

  // Non-interactive paths
  if (opts.walletCreate) {
    const passphrase = process.env.CRYPTOCLAW_WALLET_PASSPHRASE;
    if (!passphrase) {
      throw new Error("--wallet-create requires CRYPTOCLAW_WALLET_PASSPHRASE environment variable");
    }
    const label = opts.walletLabel ?? "Default";
    const wallet = await wm.createWallet(label, passphrase);
    return { action: "created", address: wallet.address, label: wallet.label };
  }

  if (opts.walletImport) {
    const privateKey = process.env.CRYPTOCLAW_WALLET_PRIVATE_KEY;
    const passphrase = process.env.CRYPTOCLAW_WALLET_PASSPHRASE;
    if (!privateKey || !passphrase) {
      throw new Error(
        "--wallet-import requires CRYPTOCLAW_WALLET_PRIVATE_KEY and CRYPTOCLAW_WALLET_PASSPHRASE environment variables",
      );
    }
    const label = opts.walletLabel ?? "Imported";
    const wallet = await wm.importWallet(privateKey as `0x${string}`, label, passphrase);
    return { action: "imported", address: wallet.address, label: wallet.label };
  }

  // Interactive flow
  if (wm.hasWallets()) {
    const { wallets, activeWalletId } = wm.listWallets();
    const active = wallets.find((w) => w.id === activeWalletId);
    await prompter.note(
      `Active wallet: ${active?.label ?? "none"} (${active?.address ?? "—"})\n` +
        `Total wallets: ${wallets.length}`,
      "Existing Wallets",
    );

    const action = await prompter.select({
      message: "Wallet setup",
      options: [
        { value: "keep", label: "Keep existing wallets" },
        { value: "create", label: "Create another wallet" },
        { value: "skip", label: "Skip" },
      ],
      initialValue: "keep",
    });

    if (action === "keep" || action === "skip") {
      return { action: action === "keep" ? "kept" : "skipped" };
    }
    // Fall through to create flow
  } else {
    const action = await prompter.select({
      message: "Set up a blockchain wallet?",
      options: [
        { value: "create", label: "Create new wallet", hint: "Generate a fresh key pair" },
        { value: "import", label: "Import existing wallet", hint: "Paste a private key" },
        { value: "skip", label: "Skip for now" },
      ],
      initialValue: "create",
    });

    if (action === "skip") {
      return { action: "skipped" };
    }

    if (action === "import") {
      return importWalletInteractive(wm, prompter, opts);
    }
  }

  // Create wallet flow
  return createWalletInteractive(wm, prompter, opts);
}

async function createWalletInteractive(
  wm: InstanceType<
    typeof import("../../extensions/blockchain/src/wallet/wallet-manager.js").WalletManager
  >,
  prompter: WizardPrompter,
  opts: Pick<OnboardOptions, "walletLabel">,
): Promise<WalletOnboardingResult> {
  const label =
    opts.walletLabel ??
    (await prompter.text({
      message: "Wallet label",
      initialValue: "Default",
      placeholder: "Default",
    }));

  const passphrase = await prompter.text({
    message: "Enter a passphrase to encrypt your wallet",
    validate: (v) => (v.length < 8 ? "Passphrase must be at least 8 characters" : undefined),
  });

  const confirm = await prompter.text({
    message: "Confirm passphrase",
    validate: (v) => (v !== passphrase ? "Passphrases do not match" : undefined),
  });

  if (confirm !== passphrase) {
    await prompter.note("Passphrases did not match. Skipping wallet creation.", "Wallet");
    return { action: "skipped" };
  }

  const spinner = prompter.progress("Creating wallet...");
  const wallet = await wm.createWallet(label, passphrase);
  spinner.stop(`Wallet created: ${wallet.address}`);

  await prompter.note(
    [
      `Address: ${wallet.address}`,
      `Label: ${wallet.label}`,
      "",
      "Back up your passphrase securely.",
      "You'll need it to sign transactions and export your key.",
    ].join("\n"),
    "Wallet Created",
  );

  return { action: "created", address: wallet.address, label: wallet.label };
}

async function importWalletInteractive(
  wm: InstanceType<
    typeof import("../../extensions/blockchain/src/wallet/wallet-manager.js").WalletManager
  >,
  prompter: WizardPrompter,
  opts: Pick<OnboardOptions, "walletLabel">,
): Promise<WalletOnboardingResult> {
  await prompter.note(
    "Your private key will be encrypted with AES-256-GCM and stored locally.\n" +
      "It will never be exposed in agent chat or session transcripts.",
    "Security",
  );

  const privateKey = await prompter.text({
    message: "Private key (0x...)",
    validate: (v) => {
      if (!/^0x[a-fA-F0-9]{64}$/.test(v)) {
        return "Invalid private key format. Expected 0x followed by 64 hex characters.";
      }
      return undefined;
    },
  });

  const label =
    opts.walletLabel ??
    (await prompter.text({
      message: "Wallet label",
      initialValue: "Imported",
      placeholder: "Imported",
    }));

  const passphrase = await prompter.text({
    message: "Enter a passphrase to encrypt the wallet",
    validate: (v) => (v.length < 8 ? "Passphrase must be at least 8 characters" : undefined),
  });

  const spinner = prompter.progress("Importing wallet...");
  const wallet = await wm.importWallet(privateKey as `0x${string}`, label, passphrase);
  spinner.stop(`Wallet imported: ${wallet.address}`);

  await prompter.note(
    [
      `Address: ${wallet.address}`,
      `Label: ${wallet.label}`,
      "",
      "Back up your passphrase securely.",
    ].join("\n"),
    "Wallet Imported",
  );

  return { action: "imported", address: wallet.address, label: wallet.label };
}
