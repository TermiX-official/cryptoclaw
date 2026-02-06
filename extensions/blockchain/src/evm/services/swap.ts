import { type Address, type Hash, formatUnits, parseUnits, maxUint256 } from "viem";
import { ERC20_ABI } from "./abi/erc20.js";
import { UNISWAP_V2_ROUTER_ABI } from "./abi/router-v2.js";
import { UNISWAP_V3_SWAP_ROUTER_ABI, UNISWAP_V3_QUOTER_V2_ABI } from "./abi/router-v3.js";
import { getPublicClient, getWalletClient } from "./clients.js";
import {
  getDexConfig,
  getWrappedNativeAddress,
  isNativeToken,
  type ChainDexConfig,
  FEE_TIER_LABELS,
} from "./dex-config.js";
import { resolveAddress } from "./ens.js";

// --- Types ---

export type TokenInfo = {
  address: string;
  symbol: string;
  decimals: number;
};

export type SwapQuote = {
  dex: string;
  version: "v2" | "v3";
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  amountOut: string;
  amountOutMin: string;
  slippageBps: number;
  priceImpact: string | null;
  path: string[];
  feeTier?: number;
  routerAddress: string;
  chainId: number;
  network: string;
};

export type SwapResult = {
  txHash: Hash;
  dex: string;
  version: "v2" | "v3";
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  expectedAmountOut: string;
  network: string;
};

// --- Token metadata helper ---

async function fetchTokenInfo(tokenAddress: string, chainId: number): Promise<TokenInfo> {
  if (isNativeToken(tokenAddress)) {
    const client = getPublicClient(chainId);
    const symbol = client.chain?.nativeCurrency?.symbol ?? "ETH";
    return { address: "native", symbol, decimals: 18 };
  }
  const client = getPublicClient(chainId);
  const address = await resolveAddress(tokenAddress, chainId);
  const [symbol, decimals] = await Promise.all([
    client.readContract({ address, abi: ERC20_ABI, functionName: "symbol" }) as Promise<string>,
    client.readContract({ address, abi: ERC20_ABI, functionName: "decimals" }) as Promise<number>,
  ]);
  return { address, symbol, decimals };
}

// --- V2 quote ---

async function getV2Quote(
  tokenInAddr: Address,
  tokenOutAddr: Address,
  amountInRaw: bigint,
  chainId: number,
  config: ChainDexConfig,
): Promise<{ amountOut: bigint; path: Address[] } | null> {
  const v2 = config.v2;
  if (!v2) return null;

  const client = getPublicClient(chainId);
  const wrappedNative = getWrappedNativeAddress(chainId);

  // Try direct path first, then via wrapped native
  const paths: Address[][] = [
    [tokenInAddr, tokenOutAddr],
    [tokenInAddr, wrappedNative, tokenOutAddr],
  ];

  // Skip the via-wrapped path if either token IS the wrapped native
  if (
    tokenInAddr.toLowerCase() === wrappedNative.toLowerCase() ||
    tokenOutAddr.toLowerCase() === wrappedNative.toLowerCase()
  ) {
    paths.length = 1;
  }

  for (const path of paths) {
    try {
      const amounts = (await client.readContract({
        address: v2.routerAddress,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: "getAmountsOut",
        args: [amountInRaw, path],
      })) as bigint[];
      const amountOut = amounts[amounts.length - 1]!;
      if (amountOut > 0n) {
        return { amountOut, path };
      }
    } catch {
      // Pair may not exist — try next path
    }
  }
  return null;
}

// --- V3 quote ---

async function getV3Quote(
  tokenInAddr: Address,
  tokenOutAddr: Address,
  amountInRaw: bigint,
  feeTier: number,
  chainId: number,
  config: ChainDexConfig,
): Promise<{ amountOut: bigint } | null> {
  const v3 = config.v3;
  if (!v3) return null;

  const client = getPublicClient(chainId);
  try {
    const result = await client.simulateContract({
      address: v3.quoterAddress as Address,
      abi: UNISWAP_V3_QUOTER_V2_ABI,
      functionName: "quoteExactInputSingle",
      args: [
        {
          tokenIn: tokenInAddr,
          tokenOut: tokenOutAddr,
          amountIn: amountInRaw,
          fee: feeTier,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });
    const amountOut = result.result as unknown as bigint;
    if (amountOut > 0n) {
      return { amountOut };
    }
  } catch {
    // Pool may not exist for this fee tier
  }
  return null;
}

// --- Public API ---

export async function getSwapQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  chainId: number,
  opts: { slippageBps?: number; preferVersion?: "v2" | "v3"; feeTier?: number } = {},
): Promise<SwapQuote> {
  const slippageBps = opts.slippageBps ?? 50; // 0.5% default
  const config = getDexConfig(chainId);
  const client = getPublicClient(chainId);
  const networkName = client.chain?.name ?? `Chain ${chainId}`;

  // Resolve token metadata
  const [inInfo, outInfo] = await Promise.all([
    fetchTokenInfo(tokenIn, chainId),
    fetchTokenInfo(tokenOut, chainId),
  ]);

  // For on-chain calls, native → wrapped native address
  const wrappedNative = getWrappedNativeAddress(chainId);
  const tokenInAddr: Address = isNativeToken(tokenIn)
    ? wrappedNative
    : await resolveAddress(tokenIn, chainId);
  const tokenOutAddr: Address = isNativeToken(tokenOut)
    ? wrappedNative
    : await resolveAddress(tokenOut, chainId);
  const amountInRaw = parseUnits(amountIn, inInfo.decimals);

  // Collect quotes from available versions
  type QuoteCandidate = {
    version: "v2" | "v3";
    dex: string;
    amountOut: bigint;
    path: string[];
    feeTier?: number;
    routerAddress: string;
  };

  const candidates: QuoteCandidate[] = [];

  // V2 quote
  if ((!opts.preferVersion || opts.preferVersion === "v2") && config.v2) {
    const v2Result = await getV2Quote(tokenInAddr, tokenOutAddr, amountInRaw, chainId, config);
    if (v2Result) {
      candidates.push({
        version: "v2",
        dex: config.v2.name,
        amountOut: v2Result.amountOut,
        path: v2Result.path,
        routerAddress: config.v2.routerAddress,
      });
    }
  }

  // V3 quote — try the requested fee tier, or default
  if ((!opts.preferVersion || opts.preferVersion === "v3") && config.v3) {
    const feeTier = opts.feeTier ?? config.v3.defaultFeeTier;
    const v3Result = await getV3Quote(
      tokenInAddr,
      tokenOutAddr,
      amountInRaw,
      feeTier,
      chainId,
      config,
    );
    if (v3Result) {
      candidates.push({
        version: "v3",
        dex: config.v3.name,
        amountOut: v3Result.amountOut,
        path: [tokenInAddr, tokenOutAddr],
        feeTier,
        routerAddress: config.v3.swapRouterAddress,
      });
    }

    // If no result on default tier, try other common tiers
    if (!v3Result && !opts.feeTier) {
      for (const tier of [500, 3000, 10000, 100]) {
        if (tier === feeTier) continue;
        const altResult = await getV3Quote(
          tokenInAddr,
          tokenOutAddr,
          amountInRaw,
          tier,
          chainId,
          config,
        );
        if (altResult) {
          candidates.push({
            version: "v3",
            dex: config.v3.name,
            amountOut: altResult.amountOut,
            path: [tokenInAddr, tokenOutAddr],
            feeTier: tier,
            routerAddress: config.v3.swapRouterAddress,
          });
          break;
        }
      }
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      `No swap route found for ${inInfo.symbol} → ${outInfo.symbol} on ${networkName}. ` +
        "The pair may not have liquidity on supported DEXes.",
    );
  }

  // Pick the best quote (highest output)
  candidates.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));
  const best = candidates[0]!;

  const amountOutFormatted = formatUnits(best.amountOut, outInfo.decimals);
  const amountOutMin = formatUnits(
    (best.amountOut * BigInt(10000 - slippageBps)) / 10000n,
    outInfo.decimals,
  );

  return {
    dex: best.dex,
    version: best.version,
    tokenIn: inInfo,
    tokenOut: outInfo,
    amountIn,
    amountOut: amountOutFormatted,
    amountOutMin,
    slippageBps,
    priceImpact: null, // Would need reserve data; omit for now
    path: best.path,
    feeTier: best.feeTier,
    routerAddress: best.routerAddress,
    chainId,
    network: networkName,
  };
}

// --- Execute swap ---

export async function executeSwap(
  privateKey: `0x${string}`,
  quote: SwapQuote,
  deadlineSeconds = 1200,
): Promise<SwapResult> {
  const { chainId, version } = quote;
  const walletClient = getWalletClient(chainId, privateKey);
  const account = walletClient.account!;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

  const nativeIn = isNativeToken(quote.tokenIn.address);
  const nativeOut = isNativeToken(quote.tokenOut.address);
  const wrappedNative = getWrappedNativeAddress(chainId);

  const amountInRaw = parseUnits(quote.amountIn, quote.tokenIn.decimals);
  const amountOutMinRaw = parseUnits(quote.amountOutMin, quote.tokenOut.decimals);

  // Auto-approve if token-in is not native
  if (!nativeIn) {
    const tokenInAddr = await resolveAddress(quote.tokenIn.address, chainId);
    await ensureAllowance(
      privateKey,
      tokenInAddr,
      quote.routerAddress as Address,
      amountInRaw,
      chainId,
    );
  }

  let txHash: Hash;

  if (version === "v2") {
    txHash = await executeV2Swap(
      walletClient,
      quote.routerAddress as Address,
      nativeIn,
      nativeOut,
      amountInRaw,
      amountOutMinRaw,
      quote.path as Address[],
      account.address,
      deadline,
    );
  } else {
    const feeTier = quote.feeTier ?? 3000;
    const tokenInAddr: Address = nativeIn
      ? wrappedNative
      : await resolveAddress(quote.tokenIn.address, chainId);
    const tokenOutAddr: Address = nativeOut
      ? wrappedNative
      : await resolveAddress(quote.tokenOut.address, chainId);

    txHash = await executeV3Swap(
      walletClient,
      quote.routerAddress as Address,
      nativeIn,
      tokenInAddr,
      tokenOutAddr,
      feeTier,
      amountInRaw,
      amountOutMinRaw,
      account.address,
      deadline,
    );
  }

  return {
    txHash,
    dex: quote.dex,
    version: quote.version,
    tokenIn: quote.tokenIn.symbol,
    tokenOut: quote.tokenOut.symbol,
    amountIn: quote.amountIn,
    expectedAmountOut: quote.amountOut,
    network: quote.network,
  };
}

// --- V2 execution ---

async function executeV2Swap(
  walletClient: ReturnType<typeof getWalletClient>,
  routerAddress: Address,
  nativeIn: boolean,
  nativeOut: boolean,
  amountIn: bigint,
  amountOutMin: bigint,
  path: Address[],
  recipient: Address,
  deadline: bigint,
): Promise<Hash> {
  if (nativeIn) {
    return walletClient.writeContract({
      address: routerAddress,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: "swapExactETHForTokens",
      args: [amountOutMin, path, recipient, deadline],
      value: amountIn,
    });
  }
  if (nativeOut) {
    return walletClient.writeContract({
      address: routerAddress,
      abi: UNISWAP_V2_ROUTER_ABI,
      functionName: "swapExactTokensForETH",
      args: [amountIn, amountOutMin, path, recipient, deadline],
    });
  }
  return walletClient.writeContract({
    address: routerAddress,
    abi: UNISWAP_V2_ROUTER_ABI,
    functionName: "swapExactTokensForTokens",
    args: [amountIn, amountOutMin, path, recipient, deadline],
  });
}

// --- V3 execution ---

async function executeV3Swap(
  walletClient: ReturnType<typeof getWalletClient>,
  routerAddress: Address,
  nativeIn: boolean,
  tokenIn: Address,
  tokenOut: Address,
  fee: number,
  amountIn: bigint,
  amountOutMinimum: bigint,
  recipient: Address,
  deadline: bigint,
): Promise<Hash> {
  return walletClient.writeContract({
    address: routerAddress,
    abi: UNISWAP_V3_SWAP_ROUTER_ABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn,
        tokenOut,
        fee,
        recipient,
        deadline,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
    value: nativeIn ? amountIn : undefined,
  });
}

// --- Allowance helpers ---

async function ensureAllowance(
  privateKey: `0x${string}`,
  tokenAddress: Address,
  spenderAddress: Address,
  requiredAmount: bigint,
  chainId: number,
): Promise<void> {
  const client = getPublicClient(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const owner = walletClient.account!.address;

  const allowance = (await client.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spenderAddress],
  })) as bigint;

  if (allowance < requiredAmount) {
    await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress, maxUint256],
    });
  }
}

// --- Check allowance (public) ---

export async function checkRouterAllowance(
  ownerAddress: string,
  tokenAddress: string,
  chainId: number,
  version?: "v2" | "v3",
): Promise<{ allowance: string; routerAddress: string; version: string; decimals: number }> {
  const config = getDexConfig(chainId);
  const client = getPublicClient(chainId);
  const owner = await resolveAddress(ownerAddress, chainId);
  const token = await resolveAddress(tokenAddress, chainId);

  // Pick the router to check
  let routerAddress: string;
  let versionUsed: string;
  if (version === "v3" && config.v3) {
    routerAddress = config.v3.swapRouterAddress;
    versionUsed = "v3";
  } else if (version === "v2" && config.v2) {
    routerAddress = config.v2.routerAddress;
    versionUsed = "v2";
  } else if (config.v3) {
    routerAddress = config.v3.swapRouterAddress;
    versionUsed = "v3";
  } else if (config.v2) {
    routerAddress = config.v2.routerAddress;
    versionUsed = "v2";
  } else {
    throw new Error(`No DEX available on chain ${chainId}`);
  }

  const [allowance, decimals] = await Promise.all([
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, routerAddress as Address],
    }) as Promise<bigint>,
    client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "decimals",
    }) as Promise<number>,
  ]);

  return {
    allowance: formatUnits(allowance, decimals),
    routerAddress,
    version: versionUsed,
    decimals,
  };
}
