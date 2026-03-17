/**
 * SecureVault factory.
 *
 * Creates the best available vault backend:
 *   1. TEE (if configured via config file or env var, and enclave is reachable)
 *   2. Local (in-process fallback, current behavior)
 *
 * Configuration (any of these, later wins):
 *   - Config file: cryptoclaw config set tee.endpoint http://localhost:3443
 *   - Env vars section: cryptoclaw config set env.vars.CRYPTOCLAW_TEE_ENDPOINT http://localhost:3443
 *   - Environment variable: CRYPTOCLAW_TEE_ENDPOINT=http://localhost:3443
 */

import { LocalVault } from "./local-vault.js";
import { TeeVault } from "./tee-vault.js";
import type { TeeConfigFromFile } from "./tee-vault.js";
import type { SecureVault } from "./types.js";

export type { SecureVault, SignedRequestParams, SignedRequestResult } from "./types.js";
export type { TeeConfigFromFile } from "./tee-vault.js";

let singleton: SecureVault | null = null;

/**
 * Get or create the SecureVault singleton.
 * First call probes for TEE; subsequent calls return the cached instance.
 *
 * @param configTee - TEE config from cryptoclaw.json `tee` section (optional).
 *                    Env vars always override config file values.
 */
export async function getVault(configTee?: TeeConfigFromFile): Promise<SecureVault> {
  if (singleton) {
    return singleton;
  }

  // Try TEE first
  const teeVault = await TeeVault.probe(configTee);
  if (teeVault) {
    singleton = teeVault;
    return singleton;
  }

  // Fallback to local
  singleton = new LocalVault();
  return singleton;
}

/**
 * Synchronous getter — returns the vault if already initialized, or creates a LocalVault.
 * Use this in tool registration where async init isn't practical.
 */
export function getVaultSync(): SecureVault {
  if (singleton) {
    return singleton;
  }
  singleton = new LocalVault();
  return singleton;
}

/**
 * Replace the vault singleton (useful for testing or late TEE init).
 */
export function setVault(vault: SecureVault): void {
  singleton = vault;
}
