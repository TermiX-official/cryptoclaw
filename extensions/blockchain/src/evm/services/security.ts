/**
 * GoPlus Address Security API client.
 * Calls the same free API that goplus-mcp uses under the hood.
 * @see https://github.com/GoPlusSecurity/goplus-mcp
 */

const GOPLUS_BASE = "https://api.gopluslabs.io/api/v1";
const FETCH_TIMEOUT_MS = 5_000;

/** Risk flags grouped by severity. */
const CRITICAL_FLAGS = new Set([
  "honeypot_related_address",
  "blacklist_doubt",
  "data_source", // sanctioned
  "blackmail_activities",
]);

const HIGH_FLAGS = new Set([
  "phishing_activities",
  "stealing_attack",
  "cybercrime",
  "money_laundering",
  "malicious_mining_activities",
  "financial_crime",
  "darkweb_transactions",
]);

const MEDIUM_FLAGS = new Set([
  "mixer",
  "fake_kyc",
  "fake_token",
  "fake_standard_interface",
  "reinit",
  "contract_address",
]);

export interface AddressSecurityResult {
  isRisky: boolean;
  riskLevel: "critical" | "high" | "medium" | "none";
  flags: string[];
  raw: Record<string, string>;
}

function classifyRisk(flags: string[]): "critical" | "high" | "medium" | "none" {
  for (const f of flags) {
    if (CRITICAL_FLAGS.has(f)) return "critical";
  }
  for (const f of flags) {
    if (HIGH_FLAGS.has(f)) return "high";
  }
  for (const f of flags) {
    if (MEDIUM_FLAGS.has(f)) return "medium";
  }
  return "none";
}

/**
 * Check address security via GoPlus API.
 * Fail-open: API errors/timeouts return a clean result so legitimate transfers aren't blocked.
 */
export async function checkAddressSecurity(
  address: string,
  chainId: number = 56,
): Promise<AddressSecurityResult> {
  const clean: AddressSecurityResult = { isRisky: false, riskLevel: "none", flags: [], raw: {} };

  try {
    const url = `${GOPLUS_BASE}/address_security/${address.toLowerCase()}?chain_id=${chainId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

    if (!res.ok) return clean;

    const json = (await res.json()) as { code?: number; result?: Record<string, string> };
    if (json.code !== 1 || !json.result) return clean;

    const raw = json.result;
    const flags: string[] = [];

    for (const [key, value] of Object.entries(raw)) {
      if (value === "1") flags.push(key);
    }

    if (flags.length === 0) return { ...clean, raw };

    const riskLevel = classifyRisk(flags);
    return {
      isRisky: riskLevel === "critical" || riskLevel === "high",
      riskLevel,
      flags,
      raw,
    };
  } catch {
    // Fail-open: network errors, timeouts, malformed JSON → don't block
    return clean;
  }
}
