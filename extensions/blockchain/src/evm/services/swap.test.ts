import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SwapQuote } from "./swap.js";

// Mock clients module before importing swap
vi.mock("./clients.js", () => ({
  getPublicClient: vi.fn(),
  getWalletClient: vi.fn(),
}));

// Mock ENS resolution
vi.mock("./ens.js", () => ({
  resolveAddress: vi.fn((addr: string) => addr as `0x${string}`),
}));

describe("swap", () => {
  const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
  const USDC = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
  const CHAIN_BSC = 56;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe("getSwapQuote", () => {
    it("returns V2 quote when V2 has liquidity", async () => {
      const { getPublicClient } = await import("./clients.js");
      const mockClient = {
        readContract: vi
          .fn()
          // Token info calls (tokenOut is "native" — resolved from chain metadata, no readContract)
          .mockResolvedValueOnce("USDC") // tokenIn symbol
          .mockResolvedValueOnce(18) // tokenIn decimals
          // V2 getAmountsOut
          .mockResolvedValueOnce([1000000000000000000n, 5000000000000000000n]),
        simulateContract: vi.fn().mockRejectedValue(new Error("No V3 pool")),
        chain: { name: "BNB Smart Chain", nativeCurrency: { symbol: "BNB" } },
      };
      vi.mocked(getPublicClient).mockReturnValue(mockClient as any);

      const { getSwapQuote } = await import("./swap.js");
      const quote = await getSwapQuote(USDC, "native", "1", CHAIN_BSC, {
        preferVersion: "v2",
      });

      expect(quote.version).toBe("v2");
      expect(quote.dex).toContain("PancakeSwap");
      expect(quote.tokenIn.symbol).toBe("USDC");
      expect(quote.chainId).toBe(CHAIN_BSC);
      expect(quote.slippageBps).toBe(50); // default
    });

    it("returns V3 quote with correct fee tier", async () => {
      const { getPublicClient } = await import("./clients.js");
      const mockClient = {
        readContract: vi
          .fn()
          .mockResolvedValueOnce("USDC") // tokenIn symbol
          .mockResolvedValueOnce(18) // tokenIn decimals
          // V2 getAmountsOut — fail to force V3
          .mockRejectedValueOnce(new Error("No V2 pair")),
        simulateContract: vi.fn().mockResolvedValueOnce({
          result: 2000000000000000000n,
        }),
        chain: { name: "BNB Smart Chain", nativeCurrency: { symbol: "BNB" } },
      };
      vi.mocked(getPublicClient).mockReturnValue(mockClient as any);

      const { getSwapQuote } = await import("./swap.js");
      const quote = await getSwapQuote(USDC, "native", "1", CHAIN_BSC, {
        preferVersion: "v3",
      });

      expect(quote.version).toBe("v3");
      expect(quote.feeTier).toBeDefined();
      expect(typeof quote.feeTier).toBe("number");
    });

    it("applies default slippage of 50 bps", async () => {
      const { getPublicClient } = await import("./clients.js");
      const mockClient = {
        readContract: vi
          .fn()
          .mockResolvedValueOnce("USDC")
          .mockResolvedValueOnce(18)
          .mockResolvedValueOnce([1000000000000000000n, 5000000000000000000n]),
        simulateContract: vi.fn().mockRejectedValue(new Error("No pool")),
        chain: { name: "BNB Smart Chain", nativeCurrency: { symbol: "BNB" } },
      };
      vi.mocked(getPublicClient).mockReturnValue(mockClient as any);

      const { getSwapQuote } = await import("./swap.js");
      const quote = await getSwapQuote(USDC, "native", "1", CHAIN_BSC, {
        preferVersion: "v2",
      });

      expect(quote.slippageBps).toBe(50);
      // amountOutMin should be less than amountOut
      expect(Number.parseFloat(quote.amountOutMin)).toBeLessThan(
        Number.parseFloat(quote.amountOut),
      );
    });

    it("applies custom slippage", async () => {
      const { getPublicClient } = await import("./clients.js");
      const mockClient = {
        readContract: vi
          .fn()
          .mockResolvedValueOnce("USDC")
          .mockResolvedValueOnce(18)
          .mockResolvedValueOnce([1000000000000000000n, 5000000000000000000n]),
        simulateContract: vi.fn().mockRejectedValue(new Error("No pool")),
        chain: { name: "BNB Smart Chain", nativeCurrency: { symbol: "BNB" } },
      };
      vi.mocked(getPublicClient).mockReturnValue(mockClient as any);

      const { getSwapQuote } = await import("./swap.js");
      const quote = await getSwapQuote(USDC, "native", "1", CHAIN_BSC, {
        slippageBps: 100,
        preferVersion: "v2",
      });

      expect(quote.slippageBps).toBe(100);
    });

    it("throws when no route found", async () => {
      const { getPublicClient } = await import("./clients.js");
      const mockClient = {
        readContract: vi
          .fn()
          .mockResolvedValueOnce("TOKEN")
          .mockResolvedValueOnce(18)
          .mockResolvedValueOnce("OTHER")
          .mockResolvedValueOnce(18)
          .mockRejectedValue(new Error("No pair")),
        simulateContract: vi.fn().mockRejectedValue(new Error("No pool")),
        chain: { name: "BNB Smart Chain", nativeCurrency: { symbol: "BNB" } },
      };
      vi.mocked(getPublicClient).mockReturnValue(mockClient as any);

      const { getSwapQuote } = await import("./swap.js");
      await expect(
        getSwapQuote(
          "0x1111111111111111111111111111111111111111",
          "0x2222222222222222222222222222222222222222",
          "1",
          CHAIN_BSC,
        ),
      ).rejects.toThrow(/No swap route found/);
    });
  });

  describe("SwapQuote shape", () => {
    it("has all required fields", () => {
      const quote: SwapQuote = {
        dex: "PancakeSwap V2",
        version: "v2",
        tokenIn: { address: USDC, symbol: "USDC", decimals: 18 },
        tokenOut: { address: "native", symbol: "BNB", decimals: 18 },
        amountIn: "1",
        amountOut: "5",
        amountOutMin: "4.975",
        slippageBps: 50,
        priceImpact: null,
        path: [USDC, WBNB],
        routerAddress: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        chainId: 56,
        network: "BNB Smart Chain",
      };

      expect(quote.dex).toBe("PancakeSwap V2");
      expect(quote.version).toBe("v2");
      expect(quote.tokenIn.symbol).toBe("USDC");
      expect(quote.tokenOut.symbol).toBe("BNB");
      expect(quote.priceImpact).toBeNull();
    });
  });

  describe("checkRouterAllowance", () => {
    it("returns formatted allowance", async () => {
      const { getPublicClient } = await import("./clients.js");
      const mockClient = {
        readContract: vi
          .fn()
          .mockResolvedValueOnce(1000000000000000000n) // allowance
          .mockResolvedValueOnce(18), // decimals
        chain: { name: "BNB Smart Chain" },
      };
      vi.mocked(getPublicClient).mockReturnValue(mockClient as any);

      const { checkRouterAllowance } = await import("./swap.js");
      const result = await checkRouterAllowance(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        USDC,
        CHAIN_BSC,
      );

      expect(result.allowance).toBe("1");
      expect(result.routerAddress).toBeTruthy();
      expect(result.version).toBeTruthy();
      expect(result.decimals).toBe(18);
    });
  });
});
