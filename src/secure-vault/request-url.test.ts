import { describe, expect, it } from "vitest";
import { resolveProviderRequestUrl } from "./request-url.js";

describe("resolveProviderRequestUrl", () => {
  it("retains provider path prefixes", () => {
    expect(resolveProviderRequestUrl("https://provider.example.test/proxy", "/account")).toBe(
      "https://provider.example.test/proxy/account",
    );
  });

  it("supports explicit local development proxies", () => {
    expect(resolveProviderRequestUrl("http://127.0.0.1:3443", "/account")).toBe(
      "http://127.0.0.1:3443/account",
    );
  });

  it.each(["file:///tmp/provider", "https://user:password@provider.example.test"])(
    "rejects invalid provider URL %s",
    (baseUrl) => {
      expect(() => resolveProviderRequestUrl(baseUrl, "/account")).toThrow();
    },
  );

  it.each(["account", "//account", "/api\\account", "/api#fragment", "/api\naccount"])(
    "rejects invalid API path %j",
    (path) => {
      expect(() => resolveProviderRequestUrl("https://provider.example.test", path)).toThrow();
    },
  );
});
