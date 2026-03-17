/**
 * Pre-configured provider settings for signed API requests.
 * Each provider defines how to sign requests and where to send them.
 */

import type { ProviderConfig } from "./types.js";

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  binance: {
    name: "binance",
    baseUrl: "https://api.binance.com",
    testnetBaseUrl: "https://testnet.binance.vision",
    signMethod: "hmac-sha256",
    apiKeyHeader: "X-MBX-APIKEY",
    signatureParam: "signature",
    includeTimestamp: true,
    timestampParam: "timestamp",
    recvWindowParam: "recvWindow",
    recvWindowDefault: 5000,
  },

  okx: {
    name: "okx",
    baseUrl: "https://www.okx.com",
    signMethod: "hmac-sha256",
    apiKeyHeader: "OK-ACCESS-KEY",
    signatureParam: "OK-ACCESS-SIGN",
    includeTimestamp: true,
    timestampParam: "OK-ACCESS-TIMESTAMP",
  },

  bybit: {
    name: "bybit",
    baseUrl: "https://api.bybit.com",
    testnetBaseUrl: "https://api-testnet.bybit.com",
    signMethod: "hmac-sha256",
    apiKeyHeader: "X-BAPI-API-KEY",
    signatureParam: "X-BAPI-SIGN",
    includeTimestamp: true,
    timestampParam: "X-BAPI-TIMESTAMP",
  },
};

export function getProviderConfig(provider: string): ProviderConfig {
  const config = PROVIDER_CONFIGS[provider.toLowerCase()];
  if (!config) {
    throw new Error(
      `Unknown provider "${provider}". Supported: ${Object.keys(PROVIDER_CONFIGS).join(", ")}`,
    );
  }
  return config;
}
