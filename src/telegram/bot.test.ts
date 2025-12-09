import { describe, expect, it, vi } from "vitest";

const useSpy = vi.fn();
const onSpy = vi.fn();
const stopSpy = vi.fn();
type ApiStub = { config: { use: (arg: unknown) => void } };
const apiStub: ApiStub = { config: { use: useSpy } };

vi.mock("grammy", () => ({
  Bot: class {
    api = apiStub;
    on = onSpy;
    stop = stopSpy;
    constructor(public token: string) {}
  },
  InputFile: class {},
  webhookCallback: vi.fn(),
}));

const throttlerSpy = vi.fn(() => "throttler");

vi.mock("@grammyjs/transformer-throttler", () => ({
  apiThrottler: () => throttlerSpy(),
}));

vi.mock("../auto-reply/reply.js", () => {
  const replySpy = vi.fn();
  return { getReplyFromConfig: replySpy, __replySpy: replySpy };
});

import { createTelegramBot } from "./bot.js";
import * as replyModule from "../auto-reply/reply.js";

describe("createTelegramBot", () => {
  it("installs grammY throttler", () => {
    createTelegramBot({ token: "tok" });
    expect(throttlerSpy).toHaveBeenCalledTimes(1);
    expect(useSpy).toHaveBeenCalledWith("throttler");
  });

  it("wraps inbound message with Telegram envelope", async () => {
    onSpy.mockReset();
    const replySpy = replyModule.__replySpy as unknown as ReturnType<
      typeof vi.fn
    >;
    replySpy.mockReset();

    createTelegramBot({ token: "tok" });
    expect(onSpy).toHaveBeenCalledWith("message", expect.any(Function));
    const handler = onSpy.mock.calls[0][1] as (ctx: any) => Promise<void>;

    const message = {
      chat: { id: 1234, type: "private" },
      text: "hello world",
      date: 1736380800, // 2025-01-09T00:00:00Z
      from: {
        first_name: "Ada",
        last_name: "Lovelace",
        username: "ada_bot",
      },
    };
    await handler({
      message,
      me: { username: "clawdis_bot" },
      getFile: async () => ({ download: async () => new Uint8Array() }),
    });

    expect(replySpy).toHaveBeenCalledTimes(1);
    const payload = replySpy.mock.calls[0][0];
    expect(payload.Body).toMatch(
      /^\[Telegram Ada Lovelace \(@ada_bot\) id:1234 2025-01-09 00:00]/,
    );
    expect(payload.Body).toContain("hello world");
  });
});
