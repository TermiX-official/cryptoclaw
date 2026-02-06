import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WizardPrompter } from "../wizard/prompts.js";
import { setupWallet } from "./onboard-wallet.js";

function createMockPrompter(responses: Record<string, unknown> = {}): WizardPrompter {
  const selectResponses = responses.select
    ? [...(Array.isArray(responses.select) ? responses.select : [responses.select])]
    : ["create"];
  const textResponses = responses.text
    ? [...(Array.isArray(responses.text) ? responses.text : [responses.text])]
    : ["Default", "testpass123", "testpass123"];

  return {
    intro: vi.fn(),
    outro: vi.fn(),
    note: vi.fn(),
    select: vi.fn().mockImplementation(() => {
      return Promise.resolve(selectResponses.shift() ?? "skip");
    }),
    multiselect: vi.fn().mockResolvedValue([]),
    text: vi.fn().mockImplementation(() => {
      return Promise.resolve(textResponses.shift() ?? "test");
    }),
    confirm: vi.fn().mockResolvedValue(true),
    progress: vi.fn().mockReturnValue({
      update: vi.fn(),
      stop: vi.fn(),
    }),
  };
}

describe("setupWallet", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "onboard-wallet-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("skips when skipWallet is true", async () => {
    const prompter = createMockPrompter();
    const result = await setupWallet(tmpDir, prompter, { skipWallet: true });
    expect(result.action).toBe("skipped");
    expect(prompter.select).not.toHaveBeenCalled();
  });

  it("creates wallet in interactive flow", async () => {
    const prompter = createMockPrompter({
      select: "create",
      text: ["MyWallet", "testpass123", "testpass123"],
    });

    const result = await setupWallet(tmpDir, prompter, {});
    expect(result.action).toBe("created");
    expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(result.label).toBe("MyWallet");
  });

  it("skips when user selects skip", async () => {
    const prompter = createMockPrompter({
      select: "skip",
    });

    const result = await setupWallet(tmpDir, prompter, {});
    expect(result.action).toBe("skipped");
  });

  it("creates wallet non-interactively with env vars", async () => {
    const prompter = createMockPrompter();
    const originalEnv = process.env.CRYPTOCLAW_WALLET_PASSPHRASE;
    process.env.CRYPTOCLAW_WALLET_PASSPHRASE = "test-passphrase-123";

    try {
      const result = await setupWallet(tmpDir, prompter, {
        walletCreate: true,
        walletLabel: "NonInteractive",
      });
      expect(result.action).toBe("created");
      expect(result.address).toMatch(/^0x/);
      expect(result.label).toBe("NonInteractive");
    } finally {
      if (originalEnv === undefined) {
        delete process.env.CRYPTOCLAW_WALLET_PASSPHRASE;
      } else {
        process.env.CRYPTOCLAW_WALLET_PASSPHRASE = originalEnv;
      }
    }
  });

  it("throws when walletCreate without passphrase env", async () => {
    const prompter = createMockPrompter();
    const originalEnv = process.env.CRYPTOCLAW_WALLET_PASSPHRASE;
    delete process.env.CRYPTOCLAW_WALLET_PASSPHRASE;

    try {
      await expect(setupWallet(tmpDir, prompter, { walletCreate: true })).rejects.toThrow(
        /CRYPTOCLAW_WALLET_PASSPHRASE/,
      );
    } finally {
      if (originalEnv !== undefined) {
        process.env.CRYPTOCLAW_WALLET_PASSPHRASE = originalEnv;
      }
    }
  });

  it("throws when walletImport without required env vars", async () => {
    const prompter = createMockPrompter();
    const origKey = process.env.CRYPTOCLAW_WALLET_PRIVATE_KEY;
    const origPass = process.env.CRYPTOCLAW_WALLET_PASSPHRASE;
    delete process.env.CRYPTOCLAW_WALLET_PRIVATE_KEY;
    delete process.env.CRYPTOCLAW_WALLET_PASSPHRASE;

    try {
      await expect(setupWallet(tmpDir, prompter, { walletImport: true })).rejects.toThrow(
        /CRYPTOCLAW_WALLET_PRIVATE_KEY/,
      );
    } finally {
      if (origKey !== undefined) {
        process.env.CRYPTOCLAW_WALLET_PRIVATE_KEY = origKey;
      }
      if (origPass !== undefined) {
        process.env.CRYPTOCLAW_WALLET_PASSPHRASE = origPass;
      }
    }
  });
});
