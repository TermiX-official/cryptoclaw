/**
 * SecureVault tools — signed API requests and vault management.
 *
 * These tools let agents interact with exchange APIs (Binance, OKX, etc.)
 * without ever touching API keys or secrets. The vault handles all signing.
 */

import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import { getVault, getVaultSync, setVault } from "../../../../../src/secure-vault/index.js";
import type { TeeConfigFromFile } from "../../../../../src/secure-vault/index.js";
import type { SecureVault } from "../../../../../src/secure-vault/types.js";

/**
 * Lazy vault reference — initialized synchronously with LocalVault,
 * then upgraded to TeeVault asynchronously if TEE is available.
 */
let vault: SecureVault = getVaultSync();

/**
 * Async TEE probe. Reads TEE config from:
 *   1. cryptoclaw.json `tee` section (passed via pluginConfig or top-level config)
 *   2. cryptoclaw.json `env.vars.CRYPTOCLAW_TEE_*` (loaded into process.env by gateway)
 *   3. Shell environment variables (always override)
 */
export async function initVault(configTee?: TeeConfigFromFile): Promise<void> {
  vault = await getVault(configTee);
  setVault(vault);
  if (vault.isTeeEnabled()) {
    console.log("[secure-vault] TEE enclave connected and attestation verified");
  }
}

export function registerVaultTools(api: OpenClawPluginApi) {
  // --- Signed API Request ---
  api.registerTool({
    name: "signed_api_request",
    description:
      "Send an authenticated API request to an exchange (Binance, OKX, Bybit). " +
      "The vault handles credential lookup, HMAC signing, and request dispatch. " +
      "You never need to handle API keys or secrets — just specify what you want to do.",
    parameters: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description: 'Exchange name: "binance", "okx", or "bybit"',
        },
        method: {
          type: "string",
          description: 'HTTP method: "GET", "POST", or "DELETE"',
        },
        path: {
          type: "string",
          description: 'API endpoint path (e.g. "/api/v3/order", "/api/v3/account")',
        },
        params: {
          type: "string",
          description:
            "JSON string of request parameters. " +
            'Example: \'{"symbol":"BTCUSDT","side":"BUY","type":"MARKET","quantity":"0.001"}\'',
        },
      },
      required: ["provider", "method", "path"],
    },
    async execute(
      _id: string,
      params: {
        provider: string;
        method: string;
        path: string;
        params?: string;
      },
    ) {
      const requestParams = params.params ? JSON.parse(params.params) : {};

      const result = await vault.signedRequest({
        provider: params.provider,
        method: params.method as "GET" | "POST" | "DELETE",
        path: params.path,
        params: requestParams,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                provider: params.provider,
                path: params.path,
                status: result.status,
                data: result.data,
                tee: vault.isTeeEnabled(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Vault Status ---
  api.registerTool({
    name: "vault_status",
    description:
      "Check the SecureVault status — whether TEE is enabled, which providers have credentials.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute() {
      const providers = ["binance", "okx", "bybit"];
      const providerStatus = providers.map((p) => ({
        provider: p,
        hasCredentials: vault.hasCredential(p),
      }));

      let attestation = null;
      if (vault.isTeeEnabled() && vault.getAttestation) {
        attestation = await vault.getAttestation();
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                available: vault.isAvailable(),
                teeEnabled: vault.isTeeEnabled(),
                providers: providerStatus,
                attestation,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Store Credential ---
  api.registerTool({
    name: "vault_store_credential",
    description:
      "Store exchange API credentials in the secure vault. " +
      "With TEE enabled, credentials are stored in enclave-encrypted memory. " +
      "Without TEE, credentials are stored in-process (current behavior).",
    parameters: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description: 'Exchange name: "binance", "okx", or "bybit"',
        },
        apiKey: {
          type: "string",
          description: "API key",
        },
        apiSecret: {
          type: "string",
          description: "API secret",
        },
        testnet: {
          type: "string",
          description: '"true" to use testnet endpoints (default: "false")',
        },
      },
      required: ["provider", "apiKey", "apiSecret"],
    },
    async execute(
      _id: string,
      params: {
        provider: string;
        apiKey: string;
        apiSecret: string;
        testnet?: string;
      },
    ) {
      await vault.storeCredential(params.provider, {
        apiKey: params.apiKey,
        apiSecret: params.apiSecret,
        testnet: params.testnet ?? "false",
      });

      // Mask credentials in response
      const maskedKey = params.apiKey.slice(0, 5) + "..." + params.apiKey.slice(-4);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "stored",
                provider: params.provider,
                apiKey: maskedKey,
                tee: vault.isTeeEnabled(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });
}
