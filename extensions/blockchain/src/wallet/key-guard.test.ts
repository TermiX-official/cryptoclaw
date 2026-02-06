import { describe, expect, it } from "vitest";
import {
  sanitizeSecrets,
  containsPrivateKey,
  CLI_ONLY_TOOLS,
  SENSITIVE_PARAM_NAMES,
  KEY_GUARD_SYSTEM_PROMPT,
} from "./key-guard.js";

describe("key-guard", () => {
  describe("sanitizeSecrets", () => {
    it("redacts 0x-prefixed 64-char hex private key", () => {
      const key = "0x" + "a".repeat(64);
      const result = sanitizeSecrets(`My key is ${key} done`);
      expect(result).toBe("My key is [REDACTED_PRIVATE_KEY] done");
      expect(result).not.toContain(key);
    });

    it("redacts bare 64-char hex string", () => {
      const bareKey = "ab".repeat(32);
      const result = sanitizeSecrets(`Key: ${bareKey}`);
      expect(result).toContain("[REDACTED_PRIVATE_KEY]");
      expect(result).not.toContain(bareKey);
    });

    it("redacts multiple private keys in one string", () => {
      const key1 = "0x" + "1a".repeat(32);
      const key2 = "0x" + "2b".repeat(32);
      const result = sanitizeSecrets(`first: ${key1} second: ${key2}`);
      expect(result).not.toContain(key1);
      expect(result).not.toContain(key2);
      expect(result.match(/\[REDACTED_PRIVATE_KEY\]/g)?.length).toBeGreaterThanOrEqual(2);
    });

    it("redacts 12-word mnemonic seed phrase", () => {
      const mnemonic =
        "abandon ability able about above absent absorb abstract absurd abuse access accident";
      const result = sanitizeSecrets(`Seed: ${mnemonic}`);
      expect(result).toContain("[REDACTED_SEED_PHRASE]");
      expect(result).not.toContain(mnemonic);
    });

    it("redacts 24-word mnemonic seed phrase", () => {
      const words =
        "abandon ability able about above absent absorb abstract absurd abuse access accident " +
        "abandon ability able about above absent absorb abstract absurd abuse access accident";
      const result = sanitizeSecrets(`Seed: ${words}`);
      expect(result).toContain("[REDACTED_SEED_PHRASE]");
    });

    it("preserves normal text without secrets", () => {
      const normal = "Hello, this is a normal message about wallet operations.";
      expect(sanitizeSecrets(normal)).toBe(normal);
    });

    it("preserves short hex strings (not private keys)", () => {
      const shortHex = "0x1234abcd";
      const result = sanitizeSecrets(`Address: ${shortHex}`);
      expect(result).toContain(shortHex);
    });

    it("preserves Ethereum addresses (42 chars)", () => {
      const address = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
      const result = sanitizeSecrets(`To: ${address}`);
      expect(result).toContain(address);
    });

    it("handles empty string", () => {
      expect(sanitizeSecrets("")).toBe("");
    });

    it("handles string with mixed content", () => {
      const key = "0x" + "ff".repeat(32);
      const result = sanitizeSecrets(
        `Transfer to 0xdAC17F958D2ee523a2206206994597C13D831ec7 using key ${key}`,
      );
      expect(result).toContain("0xdAC17F958D2ee523a2206206994597C13D831ec7");
      expect(result).not.toContain(key);
    });
  });

  describe("containsPrivateKey", () => {
    it("detects 0x-prefixed private key", () => {
      const key = "0x" + "ab".repeat(32);
      expect(containsPrivateKey(`key: ${key}`)).toBe(true);
    });

    it("detects bare 64-char hex key", () => {
      const bareKey = "cd".repeat(32);
      expect(containsPrivateKey(bareKey)).toBe(true);
    });

    it("rejects short hex strings", () => {
      expect(containsPrivateKey("0x1234abcd")).toBe(false);
    });

    it("rejects normal text", () => {
      expect(containsPrivateKey("Hello world, no keys here")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(containsPrivateKey("")).toBe(false);
    });
  });

  describe("CLI_ONLY_TOOLS", () => {
    it("contains wallet_export", () => {
      expect(CLI_ONLY_TOOLS.has("wallet_export")).toBe(true);
    });

    it("is a Set", () => {
      expect(CLI_ONLY_TOOLS).toBeInstanceOf(Set);
    });
  });

  describe("SENSITIVE_PARAM_NAMES", () => {
    it("contains privateKey", () => {
      expect(SENSITIVE_PARAM_NAMES.has("privateKey")).toBe(true);
    });

    it("contains passphrase", () => {
      expect(SENSITIVE_PARAM_NAMES.has("passphrase")).toBe(true);
    });

    it("contains mnemonic", () => {
      expect(SENSITIVE_PARAM_NAMES.has("mnemonic")).toBe(true);
    });

    it("contains password", () => {
      expect(SENSITIVE_PARAM_NAMES.has("password")).toBe(true);
    });

    it("contains seedPhrase", () => {
      expect(SENSITIVE_PARAM_NAMES.has("seedPhrase")).toBe(true);
    });

    it("contains secret", () => {
      expect(SENSITIVE_PARAM_NAMES.has("secret")).toBe(true);
    });
  });

  describe("KEY_GUARD_SYSTEM_PROMPT", () => {
    it("is a non-empty string", () => {
      expect(typeof KEY_GUARD_SYSTEM_PROMPT).toBe("string");
      expect(KEY_GUARD_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it("mentions private key protection", () => {
      expect(KEY_GUARD_SYSTEM_PROMPT).toContain("PRIVATE KEY");
    });

    it("mentions CLI-only operations", () => {
      expect(KEY_GUARD_SYSTEM_PROMPT).toContain("wallet_export");
    });
  });
});
