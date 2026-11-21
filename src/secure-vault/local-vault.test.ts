import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalVault } from "./local-vault.js";

describe("LocalVault request destination", () => {
  const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  let vault: LocalVault;

  beforeEach(async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockClear();
    vault = new LocalVault();
    await vault.storeCredential("binance", {
      apiKey: "synthetic-api-key",
      apiSecret: "synthetic-api-secret",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(["GET", "POST", "PUT", "DELETE"] as const)(
    "preserves signed %s requests to the configured provider",
    async (method) => {
      await vault.signedRequest({
        provider: "binance",
        method,
        path: "/api/v3/account",
        params: { fixture: "value" },
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [target, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(new URL(target).origin).toBe("https://api.binance.com");
      expect(options.headers).toMatchObject({ "X-MBX-APIKEY": "synthetic-api-key" });
      expect(options.redirect).toBe("error");
      const parameters = new URLSearchParams(
        method === "GET" || method === "DELETE" ? new URL(target).search : String(options.body),
      );
      expect(parameters.get("fixture")).toBe("value");
      expect(parameters.has("signature")).toBe(true);
    },
  );

  it.each(["", "account", "//account", "/api\\account", "/api#fragment", "/api\naccount"])(
    "rejects invalid path %j before signing or dispatch",
    async (path) => {
      const hmac = vi.spyOn(crypto, "createHmac");

      await expect(
        vault.signedRequest({ provider: "binance", method: "GET", path }),
      ).rejects.toThrow();

      expect(hmac).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("preserves an explicitly configured proxy path", async () => {
    await vault.signedRequest({
      provider: "binance",
      method: "GET",
      path: "/api/v3/account",
      baseUrl: "https://proxy.example.test/exchange",
    });

    const [target] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(target).origin).toBe("https://proxy.example.test");
    expect(new URL(target).pathname).toBe("/exchange/api/v3/account");
  });
});
