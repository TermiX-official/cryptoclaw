import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import JSON5 from "json5";
import { CONFIG_DIR } from "../utils.js";
import type { CronStoreFile } from "./types.js";

export const DEFAULT_CRON_DIR = path.join(CONFIG_DIR, "cron");
export const DEFAULT_CRON_STORE_PATH = path.join(DEFAULT_CRON_DIR, "jobs.json");
export const LEGACY_FLAT_CRON_STORE_PATH = path.join(CONFIG_DIR, "cron.json");

export function resolveCronStorePath(storePath?: string) {
  if (storePath?.trim()) {
    const raw = storePath.trim();
    if (raw.startsWith("~"))
      return path.resolve(raw.replace("~", os.homedir()));
    return path.resolve(raw);
  }
  return DEFAULT_CRON_STORE_PATH;
}

async function maybeMigrateLegacyFlatStore(storePath: string) {
  const resolved = path.resolve(storePath);
  const resolvedDefault = path.resolve(DEFAULT_CRON_STORE_PATH);
  if (resolved !== resolvedDefault) return;
  if (fs.existsSync(resolved)) return;
  if (!fs.existsSync(LEGACY_FLAT_CRON_STORE_PATH)) return;

  try {
    const raw = await fs.promises.readFile(
      LEGACY_FLAT_CRON_STORE_PATH,
      "utf-8",
    );
    const parsed = JSON5.parse(raw) as Partial<CronStoreFile> | null;
    const jobs = Array.isArray(parsed?.jobs) ? (parsed?.jobs as never[]) : [];
    const store: CronStoreFile = {
      version: 1,
      jobs: jobs.filter(Boolean) as never as CronStoreFile["jobs"],
    };
    await saveCronStore(storePath, store);

    await fs.promises.mkdir(DEFAULT_CRON_DIR, { recursive: true });
    const destBase = path.join(DEFAULT_CRON_DIR, "cron.json.migrated");
    const dest = fs.existsSync(destBase)
      ? path.join(
          DEFAULT_CRON_DIR,
          `cron.json.migrated.${process.pid}.${Math.random().toString(16).slice(2)}`,
        )
      : destBase;
    try {
      await fs.promises.rename(LEGACY_FLAT_CRON_STORE_PATH, dest);
    } catch {
      await fs.promises.copyFile(LEGACY_FLAT_CRON_STORE_PATH, dest);
      await fs.promises.unlink(LEGACY_FLAT_CRON_STORE_PATH).catch(() => {
        /* ignore */
      });
    }
  } catch {
    // Best-effort; keep legacy store if anything fails.
  }
}

export async function loadCronStore(storePath: string): Promise<CronStoreFile> {
  await maybeMigrateLegacyFlatStore(storePath);
  try {
    const raw = await fs.promises.readFile(storePath, "utf-8");
    const parsed = JSON5.parse(raw) as Partial<CronStoreFile> | null;
    const jobs = Array.isArray(parsed?.jobs) ? (parsed?.jobs as never[]) : [];
    return {
      version: 1,
      jobs: jobs.filter(Boolean) as never as CronStoreFile["jobs"],
    };
  } catch {
    return { version: 1, jobs: [] };
  }
}

export async function saveCronStore(storePath: string, store: CronStoreFile) {
  await fs.promises.mkdir(path.dirname(storePath), { recursive: true });
  const tmp = `${storePath}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  const json = JSON.stringify(store, null, 2);
  await fs.promises.writeFile(tmp, json, "utf-8");
  await fs.promises.rename(tmp, storePath);
  try {
    await fs.promises.copyFile(storePath, `${storePath}.bak`);
  } catch {
    // best-effort
  }
}
