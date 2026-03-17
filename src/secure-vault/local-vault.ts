/**
 * LocalVault — in-process SecureVault implementation (no TEE).
 *
 * This is the fallback when TEE hardware is not available.
 * Credentials are read from environment variables and auth-profiles.
 * Signing and HTTP requests happen in the Node.js process.
 *
 * Behavior is identical to the current system — this just wraps it
 * behind the SecureVault interface so tools can be TEE-agnostic.
 */

import crypto from "node:crypto";
import { getProviderConfig } from "./provider-configs.js";
import type { SecureVault, SignedRequestParams, SignedRequestResult } from "./types.js";

type StoredCredential = {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  testnet?: boolean;
};

export class LocalVault implements SecureVault {
  private credentials = new Map<string, StoredCredential>();

  constructor() {
    // Auto-load from environment variables
    this.loadFromEnv();
  }

  isAvailable(): boolean {
    return true;
  }

  isTeeEnabled(): boolean {
    return false;
  }

  hasCredential(provider: string): boolean {
    return this.credentials.has(provider.toLowerCase());
  }

  async storeCredential(provider: string, creds: Record<string, string>): Promise<void> {
    this.credentials.set(provider.toLowerCase(), {
      apiKey: creds.apiKey ?? creds.key ?? "",
      apiSecret: creds.apiSecret ?? creds.secret ?? "",
      passphrase: creds.passphrase,
      testnet: creds.testnet === "true",
    });
  }

  async deleteCredential(provider: string): Promise<void> {
    this.credentials.delete(provider.toLowerCase());
  }

  async signedRequest(params: SignedRequestParams): Promise<SignedRequestResult> {
    const providerKey = params.provider.toLowerCase();
    const cred = this.credentials.get(providerKey);
    if (!cred) {
      throw new Error(
        `No credentials found for "${params.provider}". ` +
          `Set ${params.provider.toUpperCase()}_API_KEY and ${params.provider.toUpperCase()}_API_SECRET environment variables.`,
      );
    }

    const config = getProviderConfig(params.provider);
    const baseUrl =
      params.baseUrl ?? (cred.testnet ? config.testnetBaseUrl : undefined) ?? config.baseUrl;

    // Build query parameters
    const queryParams = new URLSearchParams(params.params ?? {});

    // Add timestamp if required
    if (config.includeTimestamp && config.timestampParam) {
      queryParams.set(config.timestampParam, Date.now().toString());
    }

    // Add recvWindow if supported
    if (config.recvWindowParam && config.recvWindowDefault) {
      queryParams.set(config.recvWindowParam, config.recvWindowDefault.toString());
    }

    // Sign the request (HMAC-SHA256)
    const queryString = queryParams.toString();
    const signature = this.hmacSign(queryString, cred.apiSecret, config.signMethod);

    // Attach signature
    queryParams.set(config.signatureParam, signature);

    // Build request
    const url =
      params.method === "GET" || params.method === "DELETE"
        ? `${baseUrl}${params.path}?${queryParams.toString()}`
        : `${baseUrl}${params.path}`;

    const headers: Record<string, string> = {
      [config.apiKeyHeader]: cred.apiKey,
    };

    const fetchOptions: RequestInit = {
      method: params.method,
      headers,
    };

    if (params.method === "POST" || params.method === "PUT") {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchOptions.body = queryParams.toString();
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return {
      status: response.status,
      data,
    };
  }

  // --- Private ---

  private hmacSign(data: string, secret: string, method: string): string {
    if (method === "hmac-sha256") {
      return crypto.createHmac("sha256", secret).update(data).digest("hex");
    }
    throw new Error(`Unsupported sign method: ${method}`);
  }

  private loadFromEnv(): void {
    // Auto-detect credentials from standard env var patterns
    const providers = ["binance", "okx", "bybit"];
    for (const provider of providers) {
      const prefix = provider.toUpperCase();
      const apiKey = process.env[`${prefix}_API_KEY`];
      const apiSecret = process.env[`${prefix}_API_SECRET`];
      if (apiKey && apiSecret) {
        this.credentials.set(provider, {
          apiKey,
          apiSecret,
          passphrase: process.env[`${prefix}_PASSPHRASE`],
          testnet: process.env[`${prefix}_TESTNET`] === "true",
        });
      }
    }
  }
}
