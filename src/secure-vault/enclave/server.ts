/**
 * TEE Enclave Server — reference implementation.
 *
 * This runs INSIDE the TEE enclave. It:
 *   1. Holds credentials in encrypted memory (never leaves the enclave)
 *   2. Signs API requests and sends them from within the enclave
 *   3. Provides attestation reports for remote verification
 *
 * Deployment targets:
 *   - AWS Nitro Enclave (via VSOCK)
 *   - Intel SGX/TDX (via Gramine + Unix socket)
 *   - Phala dStack / Marlin Oyster CVM (via HTTP/gRPC)
 *
 * Build: Compile with reproducible builds (Nix/StageX) so MRENCLAVE
 *        is deterministic and publicly auditable.
 *
 * Usage:
 *   ENCLAVE_PORT=3443 bun src/secure-vault/enclave/server.ts
 */

import crypto from "node:crypto";
import { getProviderConfig } from "../provider-configs.js";

// --- In-memory credential store (enclave-protected) ---

type StoredCredential = {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  testnet?: boolean;
  storedAt: number;
};

type StoredWallet = {
  privateKey: string;
  address: string;
  storedAt: number;
};

const credentialStore = new Map<string, StoredCredential>();
const walletStore = new Map<string, StoredWallet>();

function findWalletByAddress(address: string): StoredWallet | undefined {
  const lower = address.toLowerCase();
  for (const wallet of walletStore.values()) {
    if (wallet.address.toLowerCase() === lower) {
      return wallet;
    }
  }
  return undefined;
}

// --- Policy engine ---

type PolicyRule = {
  maxAmountPerOrder?: number;
  allowedSymbols?: string[];
  maxOrdersPerMinute?: number;
  allowedPaths?: string[];
};

const DEFAULT_POLICY: PolicyRule = {
  maxOrdersPerMinute: 30,
  allowedPaths: [
    "/api/v3/order",
    "/api/v3/order/test",
    "/api/v3/order/oco",
    "/api/v3/openOrders",
    "/api/v3/allOrders",
    "/api/v3/account",
    "/api/v3/myTrades",
    "/api/v3/ticker/price",
    "/api/v3/ticker/24hr",
    "/api/v3/depth",
    "/api/v3/klines",
    "/api/v3/trades",
    "/api/v3/avgPrice",
    "/api/v3/exchangeInfo",
    "/api/v3/ticker/bookTicker",
    "/api/v3/account/commission",
    "/api/v3/myAllocations",
    "/api/v3/aggTrades",
  ],
};

// Rate limiting state
const orderTimestamps = new Map<string, number[]>();

function checkPolicy(provider: string, path: string, _params: Record<string, string>): void {
  const policy = DEFAULT_POLICY;

  // Path allowlist
  if (policy.allowedPaths && !policy.allowedPaths.includes(path)) {
    throw new Error(`Policy violation: path "${path}" is not in the allowlist`);
  }

  // Rate limiting
  if (policy.maxOrdersPerMinute && path.includes("/order")) {
    const now = Date.now();
    const windowMs = 60_000;
    const key = `${provider}:orders`;
    const timestamps = orderTimestamps.get(key) ?? [];
    const recent = timestamps.filter((t) => now - t < windowMs);

    if (recent.length >= policy.maxOrdersPerMinute) {
      throw new Error(
        `Policy violation: rate limit exceeded (${policy.maxOrdersPerMinute} orders/min)`,
      );
    }
    recent.push(now);
    orderTimestamps.set(key, recent);
  }
}

// --- Signing ---

function hmacSign(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

// --- RPC Handlers ---

type RpcRequest = { method: string; params: Record<string, unknown> };
type RpcResponse = { ok: boolean; data?: unknown; error?: string };

async function handleRpc(request: RpcRequest): Promise<RpcResponse> {
  try {
    switch (request.method) {
      case "health":
        return { ok: true, data: { status: "healthy", tee: true, uptime: process.uptime() } };

      case "store_credential": {
        const provider = request.params.provider as string;
        const creds = request.params.credentials as Record<string, string>;
        credentialStore.set(provider, {
          apiKey: creds.apiKey ?? creds.key ?? "",
          apiSecret: creds.apiSecret ?? creds.secret ?? "",
          passphrase: creds.passphrase,
          testnet: creds.testnet === "true",
          storedAt: Date.now(),
        });
        return { ok: true, data: { stored: provider } };
      }

      case "delete_credential": {
        const provider = request.params.provider as string;
        credentialStore.delete(provider);
        return { ok: true, data: { deleted: provider } };
      }

      case "signed_request": {
        const provider = request.params.provider as string;
        const method = request.params.method as string;
        const path = request.params.path as string;
        const params = (request.params.params ?? {}) as Record<string, string>;
        const baseUrlOverride = request.params.baseUrl as string | undefined;

        const cred = credentialStore.get(provider);
        if (!cred) {
          return { ok: false, error: `No credentials for provider "${provider}"` };
        }

        // Policy check
        checkPolicy(provider, path, params);

        // Build and sign request
        const config = getProviderConfig(provider);
        const baseUrl =
          baseUrlOverride ?? (cred.testnet ? config.testnetBaseUrl : undefined) ?? config.baseUrl;

        const queryParams = new URLSearchParams(params);
        if (config.includeTimestamp && config.timestampParam) {
          queryParams.set(config.timestampParam, Date.now().toString());
        }
        if (config.recvWindowParam && config.recvWindowDefault) {
          queryParams.set(config.recvWindowParam, config.recvWindowDefault.toString());
        }

        const queryString = queryParams.toString();
        const signature = hmacSign(queryString, cred.apiSecret);
        queryParams.set(config.signatureParam, signature);

        const url =
          method === "GET" || method === "DELETE"
            ? `${baseUrl}${path}?${queryParams.toString()}`
            : `${baseUrl}${path}`;

        const headers: Record<string, string> = {
          [config.apiKeyHeader]: cred.apiKey,
        };

        const fetchOptions: RequestInit = { method, headers };
        if (method === "POST" || method === "PUT") {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
          fetchOptions.body = queryParams.toString();
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        return {
          ok: true,
          data: { status: response.status, data },
        };
      }

      case "import_wallet": {
        const walletId = request.params.walletId as string;
        const privateKey = request.params.privateKey as string;
        const address = request.params.address as string;
        walletStore.set(walletId, {
          privateKey,
          address,
          storedAt: Date.now(),
        });
        // In a real TEE, the privateKey is now in enclave-encrypted memory.
        // The caller should clear their copy after import.
        return { ok: true, data: { imported: walletId, address } };
      }

      case "sign_transaction": {
        const walletId = request.params.walletId as string;
        const txData = request.params.txData as string;
        const chainId = request.params.chainId as number;

        // Look up by walletId or by address (tools pass address as walletId)
        const wallet = walletStore.get(walletId) ?? findWalletByAddress(walletId);
        if (!wallet) {
          return { ok: false, error: `Wallet "${walletId}" not found in enclave` };
        }

        // Sign inside the enclave — private key NEVER leaves this memory space
        const { privateKeyToAccount } = await import("viem/accounts");
        const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);

        const parsed = JSON.parse(txData);
        let signature: string;

        if (parsed.type === "message") {
          signature = await account.signMessage({ message: parsed.message });
        } else if (parsed.type === "typedData") {
          const { type: _type, ...typedDataParams } = parsed;
          signature = await account.signTypedData(typedDataParams);
        } else if (parsed.type === "transaction") {
          // The client sends pre-serialized tx; we sign the hash
          // For full control, re-sign from the deserialized tx
          signature = await account.signTransaction({
            ...(typeof parsed.serialized === "string" ? {} : parsed.serialized),
            chainId,
          });
        } else {
          // Legacy: raw transaction object
          signature = await account.signTransaction({ ...parsed, chainId });
        }

        return { ok: true, data: { signedTx: signature } };
      }

      case "get_wallet_address": {
        const walletId = request.params.walletId as string;
        const wallet = walletStore.get(walletId);
        if (!wallet) {
          return { ok: false, error: `Wallet "${walletId}" not found in enclave` };
        }
        return { ok: true, data: { address: wallet.address } };
      }

      case "get_attestation": {
        // In a real TEE, this would call platform-specific attestation APIs:
        //   - SGX: sgx_create_report() → Quoting Enclave → QUOTE
        //   - Nitro: /dev/nsm (Nitro Secure Module)
        //   - TDX: TDG.MR.REPORT
        //
        // For now, return a placeholder that includes the process hash.
        return {
          ok: true,
          data: {
            quote: "placeholder-implement-platform-attestation",
            mrenclave: "placeholder-build-hash",
            timestamp: Date.now(),
            platform: process.env.TEE_PLATFORM ?? "development",
          },
        };
      }

      case "list_providers": {
        const providers = [...credentialStore.keys()].map((name) => ({
          name,
          storedAt: credentialStore.get(name)?.storedAt,
          hasSecret: !!credentialStore.get(name)?.apiSecret,
        }));
        return { ok: true, data: { providers } };
      }

      default:
        return { ok: false, error: `Unknown method: ${request.method}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// --- HTTP Server ---

const port = Number(process.env.ENCLAVE_PORT ?? 3443);

const _server = Bun.serve({
  port,
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "POST" || !new URL(req.url).pathname.endsWith("/rpc")) {
      return new Response(JSON.stringify({ ok: false, error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RpcRequest;
    const result = await handleRpc(body);

    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  },
});

console.log(`[tee-enclave] Vault enclave server running on port ${port}`);
console.log(`[tee-enclave] Platform: ${process.env.TEE_PLATFORM ?? "development"}`);
console.log(`[tee-enclave] Credentials in memory: ${credentialStore.size}`);
