import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { generatePrivateKey } from "viem/accounts";
import { getAddressFromPrivateKey } from "../evm/services/clients.js";
import { Keystore } from "./keystore.js";

export type WalletMeta = {
  id: string;
  label: string;
  address: string;
  createdAt: string;
};

export type WalletMetaFile = {
  version: number;
  wallets: WalletMeta[];
  activeWalletId: string | null;
};

/**
 * Wallet manager: create, import, list, switch, delete, export wallets.
 * Private keys are stored encrypted; metadata (addresses, labels) is plaintext.
 */
export class WalletManager {
  private readonly keystore: Keystore;
  private readonly metaPath: string;
  private readonly walletsDir: string;

  // In-memory passphrase cache (per session)
  private cachedPassphrase: string | null = null;
  private cacheExpiry: number = 0;
  private readonly cacheTtlMs: number;

  constructor(stateDir: string, cacheTtlMs = 30 * 60 * 1000) {
    this.walletsDir = path.join(stateDir, "wallets");
    this.keystore = new Keystore(path.join(this.walletsDir, "keystore.enc"));
    this.metaPath = path.join(this.walletsDir, "keystore.meta.json");
    this.cacheTtlMs = cacheTtlMs;
  }

  /** Create a new wallet with a random private key. */
  async createWallet(label: string, passphrase: string): Promise<WalletMeta> {
    const privateKey = generatePrivateKey();
    return this.importWallet(privateKey, label, passphrase);
  }

  /** Import an existing private key as a wallet. */
  async importWallet(
    privateKey: `0x${string}`,
    label: string,
    passphrase: string,
  ): Promise<WalletMeta> {
    const address = getAddressFromPrivateKey(privateKey);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Read existing keys, add new one, write back
    const keys = await this.keystore.read(passphrase);
    keys[id] = privateKey;
    await this.keystore.write(keys, passphrase);

    // Update metadata
    const meta = this.readMeta();
    const wallet: WalletMeta = { id, label, address, createdAt: now };
    meta.wallets.push(wallet);
    if (!meta.activeWalletId) {
      meta.activeWalletId = id;
    }
    this.writeMeta(meta);
    this.cachePassphrase(passphrase);

    return wallet;
  }

  /** List all wallets (metadata only, no decryption). */
  listWallets(): { wallets: WalletMeta[]; activeWalletId: string | null } {
    const meta = this.readMeta();
    return { wallets: meta.wallets, activeWalletId: meta.activeWalletId };
  }

  /** Switch the active wallet. */
  switchWallet(idOrLabel: string): WalletMeta {
    const meta = this.readMeta();
    const wallet = meta.wallets.find(
      (w) => w.id === idOrLabel || w.label.toLowerCase() === idOrLabel.toLowerCase(),
    );
    if (!wallet) {
      throw new Error(`Wallet not found: ${idOrLabel}`);
    }
    meta.activeWalletId = wallet.id;
    this.writeMeta(meta);
    return wallet;
  }

  /** Delete a wallet (requires passphrase to re-encrypt remaining keys). */
  async deleteWallet(idOrLabel: string, passphrase: string): Promise<void> {
    const meta = this.readMeta();
    const wallet = meta.wallets.find(
      (w) => w.id === idOrLabel || w.label.toLowerCase() === idOrLabel.toLowerCase(),
    );
    if (!wallet) {
      throw new Error(`Wallet not found: ${idOrLabel}`);
    }

    // Remove from encrypted store
    const keys = await this.keystore.read(passphrase);
    delete keys[wallet.id];
    await this.keystore.write(keys, passphrase);

    // Remove from metadata
    meta.wallets = meta.wallets.filter((w) => w.id !== wallet.id);
    if (meta.activeWalletId === wallet.id) {
      meta.activeWalletId = meta.wallets[0]?.id ?? null;
    }
    this.writeMeta(meta);
  }

  /** Get the private key for the active wallet. */
  async getActivePrivateKey(passphrase?: string): Promise<`0x${string}`> {
    const meta = this.readMeta();
    if (!meta.activeWalletId) {
      throw new Error("No active wallet. Create or import a wallet first.");
    }

    const pass = passphrase ?? this.getCachedPassphrase();
    if (!pass) {
      throw new Error("Passphrase required to unlock wallet");
    }

    const keys = await this.keystore.read(pass);
    const key = keys[meta.activeWalletId];
    if (!key) {
      throw new Error("Active wallet key not found in keystore");
    }

    this.cachePassphrase(pass);
    return key as `0x${string}`;
  }

  /** Export a wallet's private key (for backup). */
  async exportWallet(idOrLabel: string, passphrase: string): Promise<string> {
    const meta = this.readMeta();
    const wallet = meta.wallets.find(
      (w) => w.id === idOrLabel || w.label.toLowerCase() === idOrLabel.toLowerCase(),
    );
    if (!wallet) {
      throw new Error(`Wallet not found: ${idOrLabel}`);
    }

    const keys = await this.keystore.read(passphrase);
    const key = keys[wallet.id];
    if (!key) {
      throw new Error("Wallet key not found in keystore");
    }

    return key;
  }

  /** Get the active wallet's address (no decryption needed). */
  getActiveAddress(): string | null {
    const meta = this.readMeta();
    if (!meta.activeWalletId) {
      return null;
    }
    const wallet = meta.wallets.find((w) => w.id === meta.activeWalletId);
    return wallet?.address ?? null;
  }

  /** Check if any wallets exist. */
  hasWallets(): boolean {
    const meta = this.readMeta();
    return meta.wallets.length > 0;
  }

  /** Cache passphrase in memory with TTL. */
  cachePassphrase(passphrase: string): void {
    this.cachedPassphrase = passphrase;
    this.cacheExpiry = Date.now() + this.cacheTtlMs;
  }

  /** Get cached passphrase if still valid. */
  getCachedPassphrase(): string | null {
    if (this.cachedPassphrase && Date.now() < this.cacheExpiry) {
      return this.cachedPassphrase;
    }
    this.cachedPassphrase = null;
    return null;
  }

  /** Clear the passphrase cache. */
  clearCache(): void {
    this.cachedPassphrase = null;
    this.cacheExpiry = 0;
  }

  private readMeta(): WalletMetaFile {
    if (!fs.existsSync(this.metaPath)) {
      return { version: 1, wallets: [], activeWalletId: null };
    }
    const raw = fs.readFileSync(this.metaPath, "utf8");
    return JSON.parse(raw) as WalletMetaFile;
  }

  private writeMeta(meta: WalletMetaFile): void {
    const dir = path.dirname(this.metaPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.metaPath, JSON.stringify(meta, null, 2), { mode: 0o600 });
  }
}
