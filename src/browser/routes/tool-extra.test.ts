import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowserRouteContext } from "../server-context.js";

const pw = vi.hoisted(() => ({
  generateLocatorForRef: vi
    .fn()
    .mockImplementation((ref: string) => `locator('aria-ref=${ref}')`),
  getConsoleMessagesViaPlaywright: vi.fn().mockResolvedValue([]),
  getNetworkRequestsViaPlaywright: vi.fn().mockResolvedValue([]),
  mouseClickViaPlaywright: vi.fn().mockResolvedValue(undefined),
  mouseDragViaPlaywright: vi.fn().mockResolvedValue(undefined),
  mouseMoveViaPlaywright: vi.fn().mockResolvedValue(undefined),
  pdfViaPlaywright: vi.fn().mockResolvedValue({ buffer: Buffer.from("pdf") }),
  startTracingViaPlaywright: vi.fn().mockResolvedValue(undefined),
  stopTracingViaPlaywright: vi
    .fn()
    .mockResolvedValue({ buffer: Buffer.from("trace") }),
  verifyElementVisibleViaPlaywright: vi.fn().mockResolvedValue(undefined),
  verifyListVisibleViaPlaywright: vi.fn().mockResolvedValue(undefined),
  verifyTextVisibleViaPlaywright: vi.fn().mockResolvedValue(undefined),
  verifyValueViaPlaywright: vi.fn().mockResolvedValue(undefined),
}));

const media = vi.hoisted(() => ({
  ensureMediaDir: vi.fn().mockResolvedValue(undefined),
  saveMediaBuffer: vi.fn().mockResolvedValue({ path: "/tmp/fake.pdf" }),
}));

vi.mock("../pw-ai.js", () => pw);
vi.mock("../../media/store.js", () => media);

import { handleBrowserToolExtra } from "./tool-extra.js";

const baseTab = {
  targetId: "tab1",
  title: "One",
  url: "https://example.com",
};

function createRes() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function createCtx(
  overrides: Partial<BrowserRouteContext> = {},
): BrowserRouteContext {
  return {
    state: () => {
      throw new Error("unused");
    },
    ensureBrowserAvailable: vi.fn().mockResolvedValue(undefined),
    ensureTabAvailable: vi.fn().mockResolvedValue(baseTab),
    isReachable: vi.fn().mockResolvedValue(true),
    listTabs: vi.fn().mockResolvedValue([baseTab]),
    openTab: vi.fn().mockResolvedValue({
      targetId: "newtab",
      title: "",
      url: "about:blank",
      type: "page",
    }),
    focusTab: vi.fn().mockResolvedValue(undefined),
    closeTab: vi.fn().mockResolvedValue(undefined),
    stopRunningBrowser: vi.fn().mockResolvedValue({ stopped: true }),
    mapTabError: vi.fn().mockReturnValue(null),
    ...overrides,
  };
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const res = createRes();
  const ctx = createCtx();
  const handled = await handleBrowserToolExtra({
    name,
    args,
    targetId: "",
    cdpPort: 18792,
    ctx,
    res,
  });
  return { res, ctx, handled };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleBrowserToolExtra", () => {
  it("dispatches extra Playwright tools", async () => {
    const cases = [
      {
        name: "browser_console_messages",
        args: { level: "error" },
        fn: pw.getConsoleMessagesViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          level: "error",
        },
        expectBody: { ok: true, messages: [], targetId: "tab1" },
      },
      {
        name: "browser_network_requests",
        args: { includeStatic: true },
        fn: pw.getNetworkRequestsViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          includeStatic: true,
        },
        expectBody: { ok: true, requests: [], targetId: "tab1" },
      },
      {
        name: "browser_start_tracing",
        args: {},
        fn: pw.startTracingViaPlaywright,
        expectArgs: { cdpPort: 18792, targetId: "tab1" },
        expectBody: { ok: true },
      },
      {
        name: "browser_verify_element_visible",
        args: { role: "button", accessibleName: "Submit" },
        fn: pw.verifyElementVisibleViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          role: "button",
          accessibleName: "Submit",
        },
        expectBody: { ok: true },
      },
      {
        name: "browser_verify_text_visible",
        args: { text: "Hello" },
        fn: pw.verifyTextVisibleViaPlaywright,
        expectArgs: { cdpPort: 18792, targetId: "tab1", text: "Hello" },
        expectBody: { ok: true },
      },
      {
        name: "browser_verify_list_visible",
        args: { ref: "1", items: ["a", "b"] },
        fn: pw.verifyListVisibleViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          ref: "1",
          items: ["a", "b"],
        },
        expectBody: { ok: true },
      },
      {
        name: "browser_verify_value",
        args: { ref: "2", type: "textbox", value: "x" },
        fn: pw.verifyValueViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          ref: "2",
          type: "textbox",
          value: "x",
        },
        expectBody: { ok: true },
      },
      {
        name: "browser_mouse_move_xy",
        args: { x: 10, y: 20 },
        fn: pw.mouseMoveViaPlaywright,
        expectArgs: { cdpPort: 18792, targetId: "tab1", x: 10, y: 20 },
        expectBody: { ok: true },
      },
      {
        name: "browser_mouse_click_xy",
        args: { x: 1, y: 2, button: "right" },
        fn: pw.mouseClickViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          x: 1,
          y: 2,
          button: "right",
        },
        expectBody: { ok: true },
      },
      {
        name: "browser_mouse_drag_xy",
        args: { startX: 1, startY: 2, endX: 3, endY: 4 },
        fn: pw.mouseDragViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          startX: 1,
          startY: 2,
          endX: 3,
          endY: 4,
        },
        expectBody: { ok: true },
      },
      {
        name: "browser_generate_locator",
        args: { ref: "99" },
        fn: pw.generateLocatorForRef,
        expectArgs: "99",
        expectBody: { ok: true, locator: "locator('aria-ref=99')" },
      },
    ];

    for (const item of cases) {
      const { res, handled } = await callTool(item.name, item.args);
      expect(handled).toBe(true);
      expect(item.fn).toHaveBeenCalledWith(item.expectArgs);
      expect(res.body).toEqual(item.expectBody);
    }
  });

  it("stores PDF and trace outputs", async () => {
    const { res: pdfRes } = await callTool("browser_pdf_save");
    expect(pw.pdfViaPlaywright).toHaveBeenCalledWith({
      cdpPort: 18792,
      targetId: "tab1",
    });
    expect(media.ensureMediaDir).toHaveBeenCalled();
    expect(media.saveMediaBuffer).toHaveBeenCalled();
    expect(pdfRes.body).toMatchObject({
      ok: true,
      path: "/tmp/fake.pdf",
      targetId: "tab1",
      url: baseTab.url,
    });

    media.saveMediaBuffer.mockResolvedValueOnce({ path: "/tmp/fake.zip" });
    const { res: traceRes } = await callTool("browser_stop_tracing");
    expect(pw.stopTracingViaPlaywright).toHaveBeenCalledWith({
      cdpPort: 18792,
      targetId: "tab1",
    });
    expect(traceRes.body).toMatchObject({
      ok: true,
      path: "/tmp/fake.zip",
      targetId: "tab1",
      url: baseTab.url,
    });
  });
});
