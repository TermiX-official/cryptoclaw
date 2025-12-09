import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadSessionStore: vi.fn().mockReturnValue({
    "+1000": { updatedAt: Date.now() - 60_000 },
  }),
  resolveStorePath: vi.fn().mockReturnValue("/tmp/sessions.json"),
  webAuthExists: vi.fn().mockResolvedValue(true),
  getWebAuthAgeMs: vi.fn().mockReturnValue(5000),
  readWebSelfId: vi.fn().mockReturnValue({ e164: "+1999" }),
  logWebSelfId: vi.fn(),
}));

vi.mock("../config/sessions.js", () => ({
  loadSessionStore: mocks.loadSessionStore,
  resolveStorePath: mocks.resolveStorePath,
}));
vi.mock("../web/session.js", () => ({
  webAuthExists: mocks.webAuthExists,
  getWebAuthAgeMs: mocks.getWebAuthAgeMs,
  readWebSelfId: mocks.readWebSelfId,
  logWebSelfId: mocks.logWebSelfId,
}));
vi.mock("../config/config.js", () => ({
  loadConfig: () => ({ inbound: { reply: { session: {} } } }),
}));

import { statusCommand } from "./status.js";

const runtime = {
  log: vi.fn(),
  error: vi.fn(),
  exit: vi.fn(),
};

describe("statusCommand", () => {
  it("prints JSON when requested", async () => {
    await statusCommand({ json: true }, runtime as never);
    const payload = JSON.parse((runtime.log as vi.Mock).mock.calls[0][0]);
    expect(payload.web.linked).toBe(true);
    expect(payload.sessions.count).toBe(1);
    expect(payload.sessions.path).toBe("/tmp/sessions.json");
  });

  it("prints formatted lines otherwise", async () => {
    (runtime.log as vi.Mock).mockClear();
    await statusCommand({}, runtime as never);
    const logs = (runtime.log as vi.Mock).mock.calls.map((c) => String(c[0]));
    expect(logs.some((l) => l.includes("Web session"))).toBe(true);
    expect(logs.some((l) => l.includes("Active sessions"))).toBe(true);
    expect(mocks.logWebSelfId).toHaveBeenCalled();
  });
});
