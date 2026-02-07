import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "openclaw",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "openclaw", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "openclaw", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "openclaw", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (dev first)", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "--dev", "--profile", "work", "status"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (profile first)", () => {
    const res = parseCliProfileArgs(["node", "openclaw", "--profile", "work", "--dev", "status"]);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join("/home/peter", ".cryptoclaw-dev");
    expect(env.CRYPTOCLAW_PROFILE).toBe("dev");
    expect(env.CRYPTOCLAW_STATE_DIR).toBe(expectedStateDir);
    expect(env.CRYPTOCLAW_CONFIG_PATH).toBe(path.join(expectedStateDir, "cryptoclaw.json"));
    expect(env.CRYPTOCLAW_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      CRYPTOCLAW_STATE_DIR: "/custom",
      CRYPTOCLAW_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.CRYPTOCLAW_STATE_DIR).toBe("/custom");
    expect(env.CRYPTOCLAW_GATEWAY_PORT).toBe("19099");
    expect(env.CRYPTOCLAW_CONFIG_PATH).toBe(path.join("/custom", "cryptoclaw.json"));
  });
});

describe("formatCliCommand", () => {
  it("returns command unchanged when no profile is set", () => {
    expect(formatCliCommand("cryptoclaw doctor --fix", {})).toBe("cryptoclaw doctor --fix");
  });

  it("returns command unchanged when profile is default", () => {
    expect(formatCliCommand("cryptoclaw doctor --fix", { CRYPTOCLAW_PROFILE: "default" })).toBe(
      "cryptoclaw doctor --fix",
    );
  });

  it("returns command unchanged when profile is Default (case-insensitive)", () => {
    expect(formatCliCommand("cryptoclaw doctor --fix", { CRYPTOCLAW_PROFILE: "Default" })).toBe(
      "cryptoclaw doctor --fix",
    );
  });

  it("returns command unchanged when profile is invalid", () => {
    expect(formatCliCommand("cryptoclaw doctor --fix", { CRYPTOCLAW_PROFILE: "bad profile" })).toBe(
      "cryptoclaw doctor --fix",
    );
  });

  it("returns command unchanged when --profile is already present", () => {
    expect(
      formatCliCommand("cryptoclaw --profile work doctor --fix", { CRYPTOCLAW_PROFILE: "work" }),
    ).toBe("cryptoclaw --profile work doctor --fix");
  });

  it("returns command unchanged when --dev is already present", () => {
    expect(formatCliCommand("cryptoclaw --dev doctor", { CRYPTOCLAW_PROFILE: "dev" })).toBe(
      "cryptoclaw --dev doctor",
    );
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("cryptoclaw doctor --fix", { CRYPTOCLAW_PROFILE: "work" })).toBe(
      "cryptoclaw --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(
      formatCliCommand("cryptoclaw doctor --fix", { CRYPTOCLAW_PROFILE: "  jbopenclaw  " }),
    ).toBe("cryptoclaw --profile jbopenclaw doctor --fix");
  });

  it("handles command with no args after openclaw", () => {
    expect(formatCliCommand("cryptoclaw", { CRYPTOCLAW_PROFILE: "test" })).toBe(
      "cryptoclaw --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm cryptoclaw doctor", { CRYPTOCLAW_PROFILE: "work" })).toBe(
      "pnpm cryptoclaw --profile work doctor",
    );
  });
});
