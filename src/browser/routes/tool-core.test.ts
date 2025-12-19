import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowserRouteContext } from "../server-context.js";

const pw = vi.hoisted(() => ({
  clickViaPlaywright: vi.fn().mockResolvedValue(undefined),
  closePageViaPlaywright: vi.fn().mockResolvedValue(undefined),
  dragViaPlaywright: vi.fn().mockResolvedValue(undefined),
  evaluateViaPlaywright: vi.fn().mockResolvedValue("result"),
  fileUploadViaPlaywright: vi.fn().mockResolvedValue(undefined),
  fillFormViaPlaywright: vi.fn().mockResolvedValue(undefined),
  handleDialogViaPlaywright: vi
    .fn()
    .mockResolvedValue({ message: "ok", type: "alert" }),
  hoverViaPlaywright: vi.fn().mockResolvedValue(undefined),
  navigateBackViaPlaywright: vi.fn().mockResolvedValue({ url: "about:blank" }),
  navigateViaPlaywright: vi
    .fn()
    .mockResolvedValue({ url: "https://example.com" }),
  pressKeyViaPlaywright: vi.fn().mockResolvedValue(undefined),
  resizeViewportViaPlaywright: vi.fn().mockResolvedValue(undefined),
  runCodeViaPlaywright: vi.fn().mockResolvedValue("ok"),
  selectOptionViaPlaywright: vi.fn().mockResolvedValue(undefined),
  snapshotAiViaPlaywright: vi
    .fn()
    .mockResolvedValue({ snapshot: "SNAP" }),
  takeScreenshotViaPlaywright: vi
    .fn()
    .mockResolvedValue({ buffer: Buffer.from("png") }),
  typeViaPlaywright: vi.fn().mockResolvedValue(undefined),
  waitForViaPlaywright: vi.fn().mockResolvedValue(undefined),
}));

const screenshot = vi.hoisted(() => ({
  DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES: 128,
  DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE: 64,
  normalizeBrowserScreenshot: vi
    .fn()
    .mockImplementation(async (buf: Buffer) => ({
      buffer: buf,
      contentType: "image/png",
    })),
}));

const media = vi.hoisted(() => ({
  ensureMediaDir: vi.fn().mockResolvedValue(undefined),
  saveMediaBuffer: vi.fn().mockResolvedValue({ path: "/tmp/fake.png" }),
}));

vi.mock("../pw-ai.js", () => pw);
vi.mock("../screenshot.js", () => screenshot);
vi.mock("../../media/store.js", () => media);

import { handleBrowserToolCore } from "./tool-core.js";

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
    listTabs: vi.fn().mockResolvedValue([
      baseTab,
      { targetId: "tab2", title: "Two", url: "https://example.com/2" },
    ]),
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

async function callTool(
  name: string,
  args: Record<string, unknown> = {},
  ctxOverride?: Partial<BrowserRouteContext>,
) {
  const res = createRes();
  const ctx = createCtx(ctxOverride);
  const handled = await handleBrowserToolCore({
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

describe("handleBrowserToolCore", () => {
  it("dispatches core Playwright tools", async () => {
    const cases = [
      {
        name: "browser_close",
        args: {},
        fn: pw.closePageViaPlaywright,
        expectArgs: { cdpPort: 18792, targetId: "tab1" },
        expectBody: { ok: true, targetId: "tab1", url: baseTab.url },
      },
      {
        name: "browser_resize",
        args: { width: 800, height: 600 },
        fn: pw.resizeViewportViaPlaywright,
        expectArgs: { cdpPort: 18792, targetId: "tab1", width: 800, height: 600 },
        expectBody: { ok: true, targetId: "tab1", url: baseTab.url },
      },
      {
        name: "browser_handle_dialog",
        args: { accept: true, promptText: "ok" },
        fn: pw.handleDialogViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          accept: true,
          promptText: "ok",
        },
        expectBody: { ok: true, message: "ok", type: "alert" },
      },
      {
        name: "browser_evaluate",
        args: { function: "() => 1", ref: "1" },
        fn: pw.evaluateViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          fn: "() => 1",
          ref: "1",
        },
        expectBody: { ok: true, result: "result" },
      },
      {
        name: "browser_file_upload",
        args: { paths: ["/tmp/file.txt"] },
        fn: pw.fileUploadViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          paths: ["/tmp/file.txt"],
        },
        expectBody: { ok: true, targetId: "tab1" },
      },
      {
        name: "browser_fill_form",
        args: { fields: [{ ref: "1", value: "x" }] },
        fn: pw.fillFormViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          fields: [{ ref: "1", value: "x" }],
        },
        expectBody: { ok: true, targetId: "tab1" },
      },
      {
        name: "browser_press_key",
        args: { key: "Enter" },
        fn: pw.pressKeyViaPlaywright,
        expectArgs: { cdpPort: 18792, targetId: "tab1", key: "Enter" },
        expectBody: { ok: true, targetId: "tab1" },
      },
      {
        name: "browser_type",
        args: { ref: "2", text: "hi", submit: true, slowly: true },
        fn: pw.typeViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          ref: "2",
          text: "hi",
          submit: true,
          slowly: true,
        },
        expectBody: { ok: true, targetId: "tab1" },
      },
      {
        name: "browser_navigate",
        args: { url: "https://example.com" },
        fn: pw.navigateViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          url: "https://example.com",
        },
        expectBody: { ok: true, targetId: "tab1", url: baseTab.url },
      },
      {
        name: "browser_navigate_back",
        args: {},
        fn: pw.navigateBackViaPlaywright,
        expectArgs: { cdpPort: 18792, targetId: "tab1" },
        expectBody: { ok: true, targetId: "tab1", url: "about:blank" },
      },
      {
        name: "browser_run_code",
        args: { code: "return 1" },
        fn: pw.runCodeViaPlaywright,
        expectArgs: { cdpPort: 18792, targetId: "tab1", code: "return 1" },
        expectBody: { ok: true, result: "ok" },
      },
      {
        name: "browser_click",
        args: {
          ref: "1",
          doubleClick: true,
          button: "right",
          modifiers: ["Shift"],
        },
        fn: pw.clickViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          ref: "1",
          doubleClick: true,
          button: "right",
          modifiers: ["Shift"],
        },
        expectBody: { ok: true, targetId: "tab1", url: baseTab.url },
      },
      {
        name: "browser_drag",
        args: { startRef: "1", endRef: "2" },
        fn: pw.dragViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          startRef: "1",
          endRef: "2",
        },
        expectBody: { ok: true, targetId: "tab1" },
      },
      {
        name: "browser_hover",
        args: { ref: "3" },
        fn: pw.hoverViaPlaywright,
        expectArgs: { cdpPort: 18792, targetId: "tab1", ref: "3" },
        expectBody: { ok: true, targetId: "tab1" },
      },
      {
        name: "browser_select_option",
        args: { ref: "4", values: ["A"] },
        fn: pw.selectOptionViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          ref: "4",
          values: ["A"],
        },
        expectBody: { ok: true, targetId: "tab1" },
      },
      {
        name: "browser_wait_for",
        args: { time: 500, text: "ok", textGone: "bye" },
        fn: pw.waitForViaPlaywright,
        expectArgs: {
          cdpPort: 18792,
          targetId: "tab1",
          time: 500,
          text: "ok",
          textGone: "bye",
        },
        expectBody: { ok: true, targetId: "tab1" },
      },
    ];

    for (const item of cases) {
      const { res, handled } = await callTool(item.name, item.args);
      expect(handled).toBe(true);
      expect(item.fn).toHaveBeenCalledWith(item.expectArgs);
      expect(res.body).toEqual(item.expectBody);
    }
  });

  it("handles screenshots via media storage", async () => {
    const { res } = await callTool("browser_take_screenshot", {
      type: "jpeg",
      ref: "1",
      fullPage: true,
      element: "main",
      filename: "shot.jpg",
    });

    expect(pw.takeScreenshotViaPlaywright).toHaveBeenCalledWith({
      cdpPort: 18792,
      targetId: "tab1",
      ref: "1",
      element: "main",
      fullPage: true,
      type: "jpeg",
    });
    expect(media.ensureMediaDir).toHaveBeenCalled();
    expect(media.saveMediaBuffer).toHaveBeenCalled();
    expect(res.body).toMatchObject({
      ok: true,
      path: "/tmp/fake.png",
      filename: "shot.jpg",
      targetId: "tab1",
      url: baseTab.url,
    });
  });

  it("handles snapshots with optional file output", async () => {
    const { res } = await callTool("browser_snapshot", {
      filename: "snapshot.txt",
    });

    expect(pw.snapshotAiViaPlaywright).toHaveBeenCalledWith({
      cdpPort: 18792,
      targetId: "tab1",
    });
    expect(media.ensureMediaDir).toHaveBeenCalled();
    expect(media.saveMediaBuffer).toHaveBeenCalledWith(
      expect.any(Buffer),
      "text/plain",
      "browser",
    );
    expect(res.body).toMatchObject({
      ok: true,
      path: "/tmp/fake.png",
      filename: "snapshot.txt",
      targetId: "tab1",
      url: baseTab.url,
    });
  });

  it("returns a message for browser_install", async () => {
    const { res } = await callTool("browser_install");
    expect(res.body).toMatchObject({ ok: true });
  });

  it("supports browser_tabs actions", async () => {
    const ctx = createCtx();

    const listRes = createRes();
    await handleBrowserToolCore({
      name: "browser_tabs",
      args: { action: "list" },
      targetId: "",
      cdpPort: 18792,
      ctx,
      res: listRes,
    });
    expect(listRes.body).toMatchObject({ ok: true });
    expect(ctx.listTabs).toHaveBeenCalled();

    const newRes = createRes();
    await handleBrowserToolCore({
      name: "browser_tabs",
      args: { action: "new" },
      targetId: "",
      cdpPort: 18792,
      ctx,
      res: newRes,
    });
    expect(ctx.ensureBrowserAvailable).toHaveBeenCalled();
    expect(ctx.openTab).toHaveBeenCalled();
    expect(newRes.body).toMatchObject({ ok: true, tab: { targetId: "newtab" } });

    const closeRes = createRes();
    await handleBrowserToolCore({
      name: "browser_tabs",
      args: { action: "close", index: 1 },
      targetId: "",
      cdpPort: 18792,
      ctx,
      res: closeRes,
    });
    expect(ctx.closeTab).toHaveBeenCalledWith("tab2");
    expect(closeRes.body).toMatchObject({ ok: true, targetId: "tab2" });

    const selectRes = createRes();
    await handleBrowserToolCore({
      name: "browser_tabs",
      args: { action: "select", index: 0 },
      targetId: "",
      cdpPort: 18792,
      ctx,
      res: selectRes,
    });
    expect(ctx.focusTab).toHaveBeenCalledWith("tab1");
    expect(selectRes.body).toMatchObject({ ok: true, targetId: "tab1" });
  });
});
