import { describe, expect, it } from "vitest";
import {
  isErc8004Supported,
  getIdentityRegistryAddress,
  getReputationRegistryAddress,
  ERC8004_MAINNET_CHAINS,
  ERC8004_TESTNET_CHAINS,
} from "./agent-identity-config.js";

describe("agent-identity-config", () => {
  describe("ERC8004_MAINNET_CHAINS", () => {
    it("includes expected mainnet chains", () => {
      expect(ERC8004_MAINNET_CHAINS).toContain(1); // Ethereum
      expect(ERC8004_MAINNET_CHAINS).toContain(56); // BSC
      expect(ERC8004_MAINNET_CHAINS).toContain(8453); // Base
      expect(ERC8004_MAINNET_CHAINS).toContain(137); // Polygon
      expect(ERC8004_MAINNET_CHAINS).toContain(42161); // Arbitrum
    });

    it("includes all 10 mainnet chains", () => {
      expect(ERC8004_MAINNET_CHAINS).toHaveLength(10);
    });

    it("includes Monad mainnet", () => {
      expect(ERC8004_MAINNET_CHAINS).toContain(143);
    });
  });

  describe("ERC8004_TESTNET_CHAINS", () => {
    it("includes expected testnet chains", () => {
      expect(ERC8004_TESTNET_CHAINS).toContain(11155111); // Sepolia
      expect(ERC8004_TESTNET_CHAINS).toContain(97); // BSC Testnet
      expect(ERC8004_TESTNET_CHAINS).toContain(84532); // Base Sepolia
      expect(ERC8004_TESTNET_CHAINS).toContain(80002); // Polygon Amoy
      expect(ERC8004_TESTNET_CHAINS).toContain(421614); // Arbitrum Sepolia
    });

    it("includes all 8 testnet chains", () => {
      expect(ERC8004_TESTNET_CHAINS).toHaveLength(8);
    });
  });

  describe("isErc8004Supported", () => {
    it("returns true for supported mainnet chains", () => {
      expect(isErc8004Supported(1)).toBe(true);
      expect(isErc8004Supported(56)).toBe(true);
      expect(isErc8004Supported(137)).toBe(true);
    });

    it("returns true for supported testnet chains", () => {
      expect(isErc8004Supported(11155111)).toBe(true);
      expect(isErc8004Supported(97)).toBe(true);
    });

    it("returns false for unsupported chains", () => {
      expect(isErc8004Supported(99999)).toBe(false);
      expect(isErc8004Supported(0)).toBe(false);
      expect(isErc8004Supported(250)).toBe(false); // Fantom
    });
  });

  describe("getIdentityRegistryAddress", () => {
    it("returns mainnet address for mainnet chains", () => {
      const addr = getIdentityRegistryAddress(1);
      expect(addr).toBe("0x8004A169FB4a3325136EB29fA0ceB6D2e539a432");
    });

    it("returns same mainnet address for all mainnet chains", () => {
      const eth = getIdentityRegistryAddress(1);
      const bsc = getIdentityRegistryAddress(56);
      const base = getIdentityRegistryAddress(8453);
      expect(eth).toBe(bsc);
      expect(bsc).toBe(base);
    });

    it("returns testnet address for testnet chains", () => {
      const addr = getIdentityRegistryAddress(11155111);
      expect(addr).toBe("0x8004A818BFB912233c491871b3d84c89A494BD9e");
    });

    it("returns same testnet address for all testnet chains", () => {
      const sepolia = getIdentityRegistryAddress(11155111);
      const bscTestnet = getIdentityRegistryAddress(97);
      expect(sepolia).toBe(bscTestnet);
    });

    it("throws for unsupported chain", () => {
      expect(() => getIdentityRegistryAddress(99999)).toThrow(/ERC-8004 not supported/);
    });
  });

  describe("getReputationRegistryAddress", () => {
    it("returns mainnet address for mainnet chains", () => {
      const addr = getReputationRegistryAddress(56);
      expect(addr).toBe("0x8004BAa17C55a88189AE136b182e5fdA19dE9b63");
    });

    it("returns testnet address for testnet chains", () => {
      const addr = getReputationRegistryAddress(97);
      expect(addr).toBe("0x8004B663056A597Dffe9eCcC1965A193B7388713");
    });

    it("throws for unsupported chain", () => {
      expect(() => getReputationRegistryAddress(99999)).toThrow(/ERC-8004 not supported/);
    });
  });

  describe("address format", () => {
    it("all addresses start with 0x8004", () => {
      // All ERC-8004 singleton addresses share the 0x8004 prefix
      for (const chainId of ERC8004_MAINNET_CHAINS) {
        expect(getIdentityRegistryAddress(chainId).startsWith("0x8004")).toBe(true);
        expect(getReputationRegistryAddress(chainId).startsWith("0x8004")).toBe(true);
      }
    });
  });
});
