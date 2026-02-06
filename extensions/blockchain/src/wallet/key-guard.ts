/**
 * Key Guard — multi-layered private key and passphrase leak prevention.
 *
 * Defense layers:
 * 1. Tool design: sensitive ops (export, import) are CLI-only, not agent tools
 * 2. Parameter stripping: passphrase/privateKey never appear as tool parameters
 * 3. Result sanitization: all tool results are scrubbed via tool_result_persist
 * 4. Outbound sanitization: messages to channels are scrubbed via message_sending
 * 5. System prompt: agent is instructed to never output private keys
 */

/** Pattern: 0x followed by exactly 64 hex characters (Ethereum private key). */
const PRIVATE_KEY_RE = /0x[a-fA-F0-9]{64}/g;

/** Pattern: hex strings of 64 chars without 0x prefix that look like keys. */
const BARE_HEX_KEY_RE = /(?<![a-fA-F0-9])[a-fA-F0-9]{64}(?![a-fA-F0-9])/g;

/** Pattern: common mnemonic seed phrase (12 or 24 lowercase words). */
const MNEMONIC_RE = /\b([a-z]{3,8}\s+){11,23}[a-z]{3,8}\b/g;

const REDACTED = "[REDACTED_PRIVATE_KEY]";
const REDACTED_MNEMONIC = "[REDACTED_SEED_PHRASE]";

/**
 * Scrub private keys and seed phrases from arbitrary text.
 * Safe to call on any string — returns original if nothing found.
 */
export function sanitizeSecrets(text: string): string {
  let result = text;
  result = result.replace(PRIVATE_KEY_RE, REDACTED);
  result = result.replace(BARE_HEX_KEY_RE, (match) => {
    // Avoid false positives: only redact if it doesn't look like a tx hash or address
    // Transaction hashes are 64 hex chars but are typically prefixed by context like "txHash"
    // We redact standalone 64-char hex to be safe
    return REDACTED;
  });
  result = result.replace(MNEMONIC_RE, REDACTED_MNEMONIC);
  return result;
}

/**
 * Check if text contains anything that looks like a private key.
 */
export function containsPrivateKey(text: string): boolean {
  return PRIVATE_KEY_RE.test(text) || BARE_HEX_KEY_RE.test(text);
}

/**
 * List of tool names that should NEVER be available as agent tools.
 * These operations are restricted to CLI-only access.
 */
export const CLI_ONLY_TOOLS = new Set(["wallet_export"]);

/**
 * List of parameter names that should be stripped from tool_result_persist output
 * and never appear in persisted agent context.
 */
export const SENSITIVE_PARAM_NAMES = new Set([
  "privateKey",
  "passphrase",
  "password",
  "mnemonic",
  "seedPhrase",
  "secret",
]);

/**
 * System prompt guard text injected via before_agent_start.
 * Instructs the agent to never handle or output private keys.
 */
export const KEY_GUARD_SYSTEM_PROMPT = `
[SECURITY — PRIVATE KEY PROTECTION]
CRITICAL RULES — violating these is a security incident:
1. NEVER output, display, repeat, or include a private key (0x + 64 hex chars) in ANY message
2. NEVER ask the user for their private key or passphrase in chat
3. If a user pastes a private key in chat, respond ONLY with: "For security, please use \`cryptoclaw wallet import\` in your terminal. Never share private keys in chat."
4. wallet_export and wallet_import are CLI-only — do NOT attempt to call them
5. For wallet creation: call wallet_create with just a label — the passphrase is prompted securely in the terminal
6. If you see a private key in any tool result, do NOT include it in your response
`.trim();
