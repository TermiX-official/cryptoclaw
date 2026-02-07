import { afterEach, describe, expect, it, vi } from "vitest";
import { checkAddressSecurity } from "./security.js";

const FAKE_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

function mockFetchResponse(result: Record<string, string>, code = 1) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ code, result }),
  } as Response);
}

afterEach(() => vi.restoreAllMocks());

describe("checkAddressSecurity", () => {
  it("returns no risk for a clean address", async () => {
    mockFetchResponse({ phishing_activities: "0", stealing_attack: "0" });
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.isRisky).toBe(false);
    expect(result.riskLevel).toBe("none");
    expect(result.flags).toEqual([]);
  });

  it("classifies critical risk flags", async () => {
    mockFetchResponse({ honeypot_related_address: "1", phishing_activities: "0" });
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.isRisky).toBe(true);
    expect(result.riskLevel).toBe("critical");
    expect(result.flags).toContain("honeypot_related_address");
  });

  it("classifies high risk flags", async () => {
    mockFetchResponse({ phishing_activities: "1", stealing_attack: "1" });
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.isRisky).toBe(true);
    expect(result.riskLevel).toBe("high");
    expect(result.flags).toContain("phishing_activities");
    expect(result.flags).toContain("stealing_attack");
  });

  it("classifies medium risk flags", async () => {
    mockFetchResponse({ mixer: "1", phishing_activities: "0" });
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.isRisky).toBe(false);
    expect(result.riskLevel).toBe("medium");
    expect(result.flags).toContain("mixer");
  });

  it("returns critical when both critical and high flags present", async () => {
    mockFetchResponse({ blacklist_doubt: "1", phishing_activities: "1" });
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.riskLevel).toBe("critical");
    expect(result.flags).toContain("blacklist_doubt");
    expect(result.flags).toContain("phishing_activities");
  });

  it("defaults to chain ID 56 (BSC)", async () => {
    const spy = mockFetchResponse({});
    await checkAddressSecurity(FAKE_ADDRESS);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("chain_id=56"), expect.any(Object));
  });

  it("lowercases the address in the URL", async () => {
    const spy = mockFetchResponse({});
    await checkAddressSecurity("0xABCDEF1234567890ABCDEF1234567890ABCDEF12", 1);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("0xabcdef1234567890abcdef1234567890abcdef12"),
      expect.any(Object),
    );
  });

  it("fail-open on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.isRisky).toBe(false);
    expect(result.riskLevel).toBe("none");
    expect(result.flags).toEqual([]);
  });

  it("fail-open on timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("aborted", "AbortError"));
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.isRisky).toBe(false);
    expect(result.riskLevel).toBe("none");
  });

  it("fail-open on non-ok HTTP response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.isRisky).toBe(false);
    expect(result.riskLevel).toBe("none");
  });

  it("fail-open on unexpected JSON shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: "shape" }),
    } as Response);
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.isRisky).toBe(false);
    expect(result.riskLevel).toBe("none");
  });

  it("fail-open on GoPlus error code", async () => {
    mockFetchResponse({ phishing_activities: "1" }, 0);
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.isRisky).toBe(false);
    expect(result.riskLevel).toBe("none");
  });

  it("ignores fields with value other than '1'", async () => {
    mockFetchResponse({ phishing_activities: "0", stealing_attack: "0", mixer: "0" });
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.flags).toEqual([]);
    expect(result.riskLevel).toBe("none");
  });

  it("includes raw response data", async () => {
    const raw = { phishing_activities: "1", stealing_attack: "0" };
    mockFetchResponse(raw);
    const result = await checkAddressSecurity(FAKE_ADDRESS, 56);
    expect(result.raw).toEqual(raw);
  });
});
