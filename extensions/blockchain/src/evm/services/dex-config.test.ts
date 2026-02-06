import { describe, expect, it } from "vitest";
import {
  getDexConfig,
  getWrappedNativeAddress,
  isNativeToken,
  getSupportedDexChainIds,
  FEE_TIERS,
  FEE_TIER_LABELS,
} from "./dex-config.js";

describe("dex-config", () => {
  describe("getDexConfig", () => {
    it("returns BSC PancakeSwap V2 + V3", () => {
      const config = getDexConfig(56);
      expect(config.v2).toBeDefined();
      expect(config.v3).toBeDefined();
      expect(config.v2!.name).toBe("PancakeSwap V2");
      expect(config.v3!.name).toBe("PancakeSwap V3");
      expect(config.v2!.routerAddress).toMatch(/^0x/);
      expect(config.v3!.swapRouterAddress).toMatch(/^0x/);
      expect(config.v3!.quoterAddress).toMatch(/^0x/);
    });

    it("returns Ethereum Uniswap V2 + V3", () => {
      const config = getDexConfig(1);
      expect(config.v2).toBeDefined();
      expect(config.v3).toBeDefined();
      expect(config.v2!.name).toBe("Uniswap V2");
      expect(config.v3!.name).toBe("Uniswap V3");
    });

    it("returns Polygon QuickSwap V2 + Uniswap V3", () => {
      const config = getDexConfig(137);
      expect(config.v2).toBeDefined();
      expect(config.v3).toBeDefined();
      expect(config.v2!.name).toBe("QuickSwap V2");
      expect(config.v3!.name).toBe("Uniswap V3");
    });

    it("returns Arbitrum Uniswap V2 + V3", () => {
      const config = getDexConfig(42161);
      expect(config.v2).toBeDefined();
      expect(config.v3).toBeDefined();
    });

    it("returns Optimism V3 only (no V2)", () => {
      const config = getDexConfig(10);
      expect(config.v2).toBeUndefined();
      expect(config.v3).toBeDefined();
      expect(config.v3!.name).toBe("Uniswap V3");
    });

    it("returns Base V3 only (no V2)", () => {
      const config = getDexConfig(8453);
      expect(config.v2).toBeUndefined();
      expect(config.v3).toBeDefined();
    });

    it("throws for unsupported chain ID", () => {
      expect(() => getDexConfig(99999)).toThrow(/No DEX configuration for chain 99999/);
    });
  });

  describe("getWrappedNativeAddress", () => {
    it("returns WBNB for BSC", () => {
      const addr = getWrappedNativeAddress(56);
      expect(addr.toLowerCase()).toBe("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c");
    });

    it("returns WETH for Ethereum", () => {
      const addr = getWrappedNativeAddress(1);
      expect(addr.toLowerCase()).toBe("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
    });

    it("returns WMATIC for Polygon", () => {
      const addr = getWrappedNativeAddress(137);
      expect(addr.toLowerCase()).toBe("0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270");
    });

    it("throws for unsupported chain", () => {
      expect(() => getWrappedNativeAddress(99999)).toThrow();
    });
  });

  describe("isNativeToken", () => {
    it.each([
      "native",
      "eth",
      "bnb",
      "matic",
      "0x0000000000000000000000000000000000000000",
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    ])("returns true for %s", (input) => {
      expect(isNativeToken(input)).toBe(true);
    });

    it("returns true case-insensitively", () => {
      expect(isNativeToken("NATIVE")).toBe(true);
      expect(isNativeToken("ETH")).toBe(true);
      expect(isNativeToken("BNB")).toBe(true);
    });

    it("returns false for arbitrary address", () => {
      expect(isNativeToken("0xdAC17F958D2ee523a2206206994597C13D831ec7")).toBe(false);
    });

    it("returns false for random text", () => {
      expect(isNativeToken("hello")).toBe(false);
    });
  });

  describe("getSupportedDexChainIds", () => {
    it("includes major chain IDs", () => {
      const ids = getSupportedDexChainIds();
      expect(ids).toContain(1); // Ethereum
      expect(ids).toContain(56); // BSC
      expect(ids).toContain(137); // Polygon
      expect(ids).toContain(42161); // Arbitrum
      expect(ids).toContain(10); // Optimism
      expect(ids).toContain(8453); // Base
    });

    it("returns numeric array", () => {
      const ids = getSupportedDexChainIds();
      for (const id of ids) {
        expect(typeof id).toBe("number");
      }
    });
  });

  describe("FEE_TIERS", () => {
    it("contains standard Uniswap V3 tiers", () => {
      expect(FEE_TIERS).toEqual([100, 500, 3000, 10000]);
    });
  });

  describe("FEE_TIER_LABELS", () => {
    it("maps tiers to human-readable percentages", () => {
      expect(FEE_TIER_LABELS[100]).toBe("0.01%");
      expect(FEE_TIER_LABELS[500]).toBe("0.05%");
      expect(FEE_TIER_LABELS[3000]).toBe("0.3%");
      expect(FEE_TIER_LABELS[10000]).toBe("1%");
    });
  });
});
