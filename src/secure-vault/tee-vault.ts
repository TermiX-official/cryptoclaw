/**
 * TeeVault — TEE-backed SecureVault implementation.
 *
 * Delegates all secret operations to a TEE enclave via gRPC.
 * Private keys and API secrets never leave the enclave.
 *
 * Communication protocol:
 *   Gateway (Node.js) ←─ gRPC ─→ TEE Enclave (Rust/Go service)
 *
 * The enclave exposes a simple RPC interface:
 *   - StoreCredential(provider, encrypted_creds)
 *   - SignedRequest(provider, method, path, params) → response
 *   - GetAttestation() → attestation_report
 *
 * In production, the gRPC channel is over:
 *   - VSOCK (AWS Nitro Enclaves)
 *   - Unix socket (Intel SGX/TDX local)
 *   - mTLS (remote TEE, e.g. Phala/Marlin)
 */

import type { SecureVault, SignedRequestParams, SignedRequestResult } from "./types.js";

/**
 * TEE config read from cryptoclaw.json `tee` section.
 * Passed into probe() by the caller who has access to the config.
 */
export type TeeConfigFromFile = {
  endpoint?: string;
  transport?: string;
  mrenclave?: string;
};

type TeeVaultConfig = {
  /** Enclave endpoint. */
  endpoint: string;
  /** Connection type. */
  transport: "vsock" | "unix" | "grpc";
  /** Expected MRENCLAVE (code hash) for attestation verification. */
  expectedMrenclave?: string;
  /** Connection timeout in ms. */
  timeoutMs?: number;
};

type EnclaveRpcRequest = {
  method: string;
  params: Record<string, unknown>;
};

type EnclaveRpcResponse = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

export class TeeVault implements SecureVault {
  private readonly config: TeeVaultConfig;
  private connected = false;
  private attestationVerified = false;

  constructor(config: TeeVaultConfig) {
    this.config = {
      timeoutMs: 10_000,
      ...config,
    };
  }

  /**
   * Probe for TEE enclave availability.
   * Returns a configured TeeVault if an enclave is reachable, or null.
   *
   * Configuration sources (later wins):
   *   1. Config file: cryptoclaw config set tee.endpoint http://localhost:3443
   *   2. Config env.vars: cryptoclaw config set env.vars.CRYPTOCLAW_TEE_ENDPOINT http://localhost:3443
   *   3. Environment variable: CRYPTOCLAW_TEE_ENDPOINT=http://localhost:3443
   */
  static async probe(configTee?: TeeConfigFromFile): Promise<TeeVault | null> {
    // Merge: config file < env vars (env wins)
    const endpoint = process.env.CRYPTOCLAW_TEE_ENDPOINT ?? configTee?.endpoint;
    const transport = (process.env.CRYPTOCLAW_TEE_TRANSPORT ??
      configTee?.transport ??
      "grpc") as TeeVaultConfig["transport"];
    const expectedMrenclave = process.env.CRYPTOCLAW_TEE_MRENCLAVE ?? configTee?.mrenclave;

    if (!endpoint) {
      return null;
    }

    const vault = new TeeVault({ endpoint, transport, expectedMrenclave });

    try {
      await vault.connect();
      return vault;
    } catch {
      return null;
    }
  }

  isAvailable(): boolean {
    return this.connected;
  }

  isTeeEnabled(): boolean {
    return this.connected && this.attestationVerified;
  }

  hasCredential(_provider: string): boolean {
    // Query the enclave synchronously is not practical;
    // we trust that storeCredential was called during setup.
    // In production, maintain a local provider set synced on connect.
    return this.connected;
  }

  async storeCredential(provider: string, credentials: Record<string, string>): Promise<void> {
    await this.rpc("store_credential", {
      provider: provider.toLowerCase(),
      credentials,
    });
  }

  async deleteCredential(provider: string): Promise<void> {
    await this.rpc("delete_credential", {
      provider: provider.toLowerCase(),
    });
  }

  async signedRequest(params: SignedRequestParams): Promise<SignedRequestResult> {
    const response = await this.rpc("signed_request", {
      provider: params.provider.toLowerCase(),
      method: params.method,
      path: params.path,
      params: params.params ?? {},
      baseUrl: params.baseUrl,
    });

    return response as SignedRequestResult;
  }

  async signTransaction(walletId: string, txData: string, chainId: number): Promise<string> {
    const response = await this.rpc("sign_transaction", {
      walletId,
      txData,
      chainId,
    });
    return (response as { signedTx: string }).signedTx;
  }

  async getWalletAddress(walletId: string): Promise<string> {
    const response = await this.rpc("get_wallet_address", { walletId });
    return (response as { address: string }).address;
  }

  async importWallet(walletId: string, privateKey: string, address: string): Promise<void> {
    await this.rpc("import_wallet", { walletId, privateKey, address });
  }

  async getAttestation(): Promise<{ quote: string; mrenclave: string } | null> {
    if (!this.connected) {
      return null;
    }
    const response = await this.rpc("get_attestation", {});
    return response as { quote: string; mrenclave: string };
  }

  // --- Connection & RPC ---

  private async connect(): Promise<void> {
    // Attempt connection to enclave
    const healthResponse = await this.rpc("health", {});
    if (!healthResponse) {
      throw new Error("TEE enclave health check failed");
    }

    this.connected = true;

    // Verify attestation if MRENCLAVE is specified
    if (this.config.expectedMrenclave) {
      const attestation = await this.getAttestation();
      if (!attestation) {
        throw new Error("TEE enclave did not return attestation");
      }
      if (attestation.mrenclave !== this.config.expectedMrenclave) {
        this.connected = false;
        throw new Error(
          `TEE attestation mismatch: expected MRENCLAVE ${this.config.expectedMrenclave}, ` +
            `got ${attestation.mrenclave}. The enclave may be running unexpected code.`,
        );
      }
      this.attestationVerified = true;
    }
  }

  /**
   * Send an RPC request to the TEE enclave.
   *
   * In production this would be:
   *   - VSOCK: CID + port for AWS Nitro
   *   - Unix socket: /var/run/tee-vault.sock for local SGX
   *   - gRPC/HTTP: endpoint URL for remote TEE
   *
   * Current implementation uses HTTP/JSON for simplicity.
   * Replace with gRPC/protobuf for production.
   */
  private async rpc(method: string, params: Record<string, unknown>): Promise<unknown> {
    const request: EnclaveRpcRequest = { method, params };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.endpoint}/rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const result = (await response.json()) as EnclaveRpcResponse;
      if (!result.ok) {
        throw new Error(`TEE enclave error: ${result.error ?? "unknown"}`);
      }

      return result.data;
    } finally {
      clearTimeout(timeout);
    }
  }
}
