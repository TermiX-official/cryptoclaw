import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { createClawdisCodingTools } from "./pi-tools.js";

const PNG_1x1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/woAAn8B9FD5fHAAAAAASUVORK5CYII=";

describe("createClawdisCodingTools", () => {
  it("sniffs mime from bytes when extension lies", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawdis-pi-"));
    const filePath = path.join(tmpDir, "image.jpg"); // actually PNG bytes
    await fs.writeFile(filePath, Buffer.from(PNG_1x1, "base64"));

    const read = createClawdisCodingTools().find((t) => t.name === "read");
    expect(read).toBeTruthy();
    if (!read) throw new Error("read tool missing");

    const res = await read.execute("toolCallId", { path: filePath });
    const image = res.content.find(
      (b): b is { type: "image"; mimeType: string } =>
        !!b &&
        typeof b === "object" &&
        (b as Record<string, unknown>).type === "image" &&
        typeof (b as Record<string, unknown>).mimeType === "string",
    );

    expect(image?.mimeType).toBe("image/png");
  });

  it("downscales oversized images for LLM safety", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "clawdis-pi-"));
    const filePath = path.join(tmpDir, "oversized.png");

    const buf = await sharp({
      create: {
        width: 2001,
        height: 10,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();
    await fs.writeFile(filePath, buf);

    const read = createClawdisCodingTools().find((t) => t.name === "read");
    expect(read).toBeTruthy();
    if (!read) throw new Error("read tool missing");

    const res = await read.execute("toolCallId", { path: filePath });
    const image = res.content.find(
      (b): b is { type: "image"; mimeType: string; data: string } =>
        !!b &&
        typeof b === "object" &&
        (b as Record<string, unknown>).type === "image" &&
        typeof (b as Record<string, unknown>).mimeType === "string" &&
        typeof (b as Record<string, unknown>).data === "string",
    );
    expect(image).toBeTruthy();
    if (!image) throw new Error("image block missing");

    const decoded = Buffer.from(image.data, "base64");
    const meta = await sharp(decoded).metadata();
    expect(meta.width).toBeLessThanOrEqual(2000);
    expect(meta.height).toBeLessThanOrEqual(2000);
  });
});
