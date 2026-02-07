import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WalletManager } from "./wallet-manager.js";

describe("WalletManager", () => {
  let tmpDir: string;
  let wm: WalletManager;
  const passphrase = "test-passphrase-123";

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wm-test-"));
    wm = new WalletManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("hasWallets", () => {
    it("returns false initially", () => {
      expect(wm.hasWallets()).toBe(false);
    });

    it("returns true after creating a wallet", async () => {
      await wm.createWallet("Test", passphrase);
      expect(wm.hasWallets()).toBe(true);
    });
  });

  describe("createWallet", () => {
    it("creates a wallet with correct metadata", async () => {
      const wallet = await wm.createWallet("MyWallet", passphrase);
      expect(wallet.label).toBe("MyWallet");
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(wallet.id).toBeTruthy();
      expect(wallet.createdAt).toBeTruthy();
    });

    it("auto-sets active wallet on first create", async () => {
      const wallet = await wm.createWallet("First", passphrase);
      const { activeWalletId } = wm.listWallets();
      expect(activeWalletId).toBe(wallet.id);
    });

    it("keeps first wallet as active when creating additional wallets", async () => {
      const first = await wm.createWallet("First", passphrase);
      await wm.createWallet("Second", passphrase);
      const { activeWalletId } = wm.listWallets();
      expect(activeWalletId).toBe(first.id);
    });

    it("generates unique addresses for different wallets", async () => {
      const w1 = await wm.createWallet("One", passphrase);
      const w2 = await wm.createWallet("Two", passphrase);
      expect(w1.address).not.toBe(w2.address);
    });
  });

  describe("importWallet", () => {
    // Known test private key — DO NOT use with real funds
    const testKey =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;
    const expectedAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

    it("imports a wallet and derives correct address", async () => {
      const wallet = await wm.importWallet(testKey, "Imported", passphrase);
      expect(wallet.address).toBe(expectedAddress);
      expect(wallet.label).toBe("Imported");
    });

    it("can export the imported key", async () => {
      const wallet = await wm.importWallet(testKey, "Imported", passphrase);
      const exported = await wm.exportWallet(wallet.id, passphrase);
      expect(exported).toBe(testKey);
    });
  });

  describe("listWallets", () => {
    it("returns empty list initially", () => {
      const { wallets } = wm.listWallets();
      expect(wallets).toEqual([]);
    });

    it("returns all created wallets", async () => {
      await wm.createWallet("A", passphrase);
      await wm.createWallet("B", passphrase);
      const { wallets } = wm.listWallets();
      expect(wallets).toHaveLength(2);
      expect(wallets.map((w) => w.label)).toEqual(["A", "B"]);
    });
  });

  describe("switchWallet", () => {
    it("switches active wallet by id", async () => {
      await wm.createWallet("First", passphrase);
      const second = await wm.createWallet("Second", passphrase);
      wm.switchWallet(second.id);
      const { activeWalletId } = wm.listWallets();
      expect(activeWalletId).toBe(second.id);
    });

    it("switches active wallet by label (case-insensitive)", async () => {
      await wm.createWallet("First", passphrase);
      const second = await wm.createWallet("Second", passphrase);
      wm.switchWallet("second");
      const { activeWalletId } = wm.listWallets();
      expect(activeWalletId).toBe(second.id);
    });

    it("throws for non-existent wallet", () => {
      expect(() => wm.switchWallet("nonexistent")).toThrow(/Wallet not found/);
    });
  });

  describe("deleteWallet", () => {
    it("deletes a wallet", async () => {
      const wallet = await wm.createWallet("ToDelete", passphrase);
      await wm.deleteWallet(wallet.id, passphrase);
      const { wallets } = wm.listWallets();
      expect(wallets).toHaveLength(0);
    });

    it("switches active wallet after deleting active one", async () => {
      const first = await wm.createWallet("First", passphrase);
      const second = await wm.createWallet("Second", passphrase);
      // First is active by default
      await wm.deleteWallet(first.id, passphrase);
      const { activeWalletId } = wm.listWallets();
      expect(activeWalletId).toBe(second.id);
    });

    it("sets active to null when deleting last wallet", async () => {
      const wallet = await wm.createWallet("Only", passphrase);
      await wm.deleteWallet(wallet.id, passphrase);
      const { activeWalletId } = wm.listWallets();
      expect(activeWalletId).toBeNull();
    });

    it("throws for non-existent wallet", async () => {
      await expect(wm.deleteWallet("nonexistent", passphrase)).rejects.toThrow(/Wallet not found/);
    });
  });

  describe("exportWallet", () => {
    it("exports a wallet private key", async () => {
      const wallet = await wm.createWallet("Export", passphrase);
      const key = await wm.exportWallet(wallet.id, passphrase);
      expect(key).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("throws for wrong passphrase", async () => {
      const wallet = await wm.createWallet("Locked", passphrase);
      await expect(wm.exportWallet(wallet.id, "wrong-passphrase")).rejects.toThrow();
    });

    it("throws for non-existent wallet", async () => {
      await expect(wm.exportWallet("nonexistent", passphrase)).rejects.toThrow(/Wallet not found/);
    });
  });

  describe("getActiveAddress", () => {
    it("returns null when no wallets exist", () => {
      expect(wm.getActiveAddress()).toBeNull();
    });

    it("returns active wallet address", async () => {
      const wallet = await wm.createWallet("Active", passphrase);
      expect(wm.getActiveAddress()).toBe(wallet.address);
    });
  });

  describe("getActivePrivateKey", () => {
    it("returns private key with passphrase", async () => {
      await wm.createWallet("Key", passphrase);
      wm.cachePassphrase(passphrase);
      const key = await wm.getActivePrivateKey();
      expect(key).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it("throws when no wallets exist", async () => {
      await expect(wm.getActivePrivateKey(passphrase)).rejects.toThrow(/No active wallet/);
    });

    it("throws when passphrase not provided and not cached", async () => {
      await wm.createWallet("NeedPass", passphrase);
      wm.clearCache();
      await expect(wm.getActivePrivateKey()).rejects.toThrow(/Passphrase required/);
    });
  });

  describe("passphrase cache", () => {
    it("caches and retrieves passphrase", () => {
      wm.cachePassphrase("mypass");
      expect(wm.getCachedPassphrase()).toBe("mypass");
    });

    it("clears cache explicitly", () => {
      wm.cachePassphrase("mypass");
      wm.clearCache();
      expect(wm.getCachedPassphrase()).toBeNull();
    });

    it("expires cached passphrase after TTL", async () => {
      // Create a wallet manager with very short TTL (50ms)
      const shortTtlWm = new WalletManager(tmpDir, 50);
      shortTtlWm.cachePassphrase("expiring");
      expect(shortTtlWm.getCachedPassphrase()).toBe("expiring");

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(shortTtlWm.getCachedPassphrase()).toBeNull();
    });
  });
});
