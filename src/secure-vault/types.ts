/**
 * SecureVault — unified interface for secret operations.
 *
 * All private keys, API secrets, and signing operations go through this interface.
 * Two implementations:
 *   - LocalVault: in-process (no TEE, current behavior)
 *   - TeeVault: delegates to a TEE enclave via gRPC/VSOCK
 *
 * Tools never touch secrets directly — they call vault methods.
 */

// --- Signed HTTP Request ---

export type SignedRequestParams = {
  /** Provider identifier (e.g. "binance", "okx", "bybit"). */
  provider: string;
  /** HTTP method. */
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** API path (e.g. "/api/v3/order"). */
  path: string;
  /** Query/body parameters (will be signed). */
  params?: Record<string, string>;
  /** Override base URL (otherwise resolved from provider config). */
  baseUrl?: string;
};

export type SignedRequestResult = {
  status: number;
  data: unknown;
  headers?: Record<string, string>;
};

// --- Transaction Signing ---

export type SignTransactionParams = {
  /** Wallet ID (from WalletManager). */
  walletId: string;
  /** Chain ID. */
  chainId: number;
  /** Contract address. */
  to: `0x${string}`;
  /** Encoded calldata. */
  data: `0x${string}`;
  /** Value in wei (optional). */
  value?: bigint;
};

// --- Provider Config ---

export type ProviderConfig = {
  /** Provider name (e.g. "binance"). */
  name: string;
  /** Base URL for API requests. */
  baseUrl: string;
  /** Testnet base URL. */
  testnetBaseUrl?: string;
  /** Whether to use testnet. */
  testnet?: boolean;
  /** Signing method. */
  signMethod: "hmac-sha256" | "rsa" | "ed25519";
  /** How to attach the API key to requests. */
  apiKeyHeader: string;
  /** How to attach the signature to requests. */
  signatureParam: string;
  /** Whether to include timestamp in signed params. */
  includeTimestamp?: boolean;
  /** Timestamp parameter name. */
  timestampParam?: string;
  /** Receive window parameter name and default value. */
  recvWindowParam?: string;
  recvWindowDefault?: number;
};

// --- Wallet Transaction Signing ---

export type SignTransactionRequest = {
  /** Chain ID. */
  chainId: number;
  /** Recipient address. */
  to: `0x${string}`;
  /** Value in wei (hex string). */
  value?: string;
  /** Encoded calldata (hex). */
  data?: string;
  /** Gas limit (hex). */
  gas?: string;
};

export type SignTransactionResult = {
  /** Signed raw transaction (hex). */
  signedTx: string;
  /** Transaction hash. */
  txHash: string;
};

// --- Vault Interface ---

export interface SecureVault {
  /**
   * Send a signed API request through the vault.
   * The vault handles: reading credentials, signing, sending, returning results.
   * The caller never sees API keys or secrets.
   */
  signedRequest(params: SignedRequestParams): Promise<SignedRequestResult>;

  /**
   * Store a credential in the vault.
   * For TEE: stored in enclave-encrypted memory.
   * For Local: stored in auth-profiles.json.
   */
  storeCredential(provider: string, credentials: Record<string, string>): Promise<void>;

  /**
   * Check if credentials exist for a provider.
   */
  hasCredential(provider: string): boolean;

  /**
   * Delete credentials for a provider.
   */
  deleteCredential(provider: string): Promise<void>;

  /**
   * Check if the vault backend is available.
   * For TEE: checks enclave connectivity.
   * For Local: always true.
   */
  isAvailable(): boolean;

  /**
   * Whether this vault is backed by TEE hardware.
   */
  isTeeEnabled(): boolean;

  /**
   * Sign a raw Ethereum transaction inside the vault.
   * For TEE: private key never leaves the enclave.
   * For Local: signs in-process (current behavior).
   *
   * @param walletId - Wallet ID from WalletManager.
   * @param txData - Serialized unsigned transaction (hex).
   * @param chainId - Chain ID for EIP-155 replay protection.
   * @returns Signed transaction hex string.
   */
  signTransaction?(walletId: string, txData: string, chainId: number): Promise<string>;

  /**
   * Get the address for a wallet stored in the vault.
   * Needed so tools can reference the sender address without accessing the private key.
   */
  getWalletAddress?(walletId: string): Promise<string>;

  /**
   * Get a TEE attestation report (TEE-only, returns null for local vault).
   */
  getAttestation?(): Promise<{ quote: string; mrenclave: string } | null>;
}
