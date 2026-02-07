import type { SkillStatusEntry } from "../agents/skills-status.js";
import type { OpenClawConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { installSkill } from "../agents/skills-install.js";
import { buildWorkspaceSkillStatus } from "../agents/skills-status.js";
import { formatCliCommand } from "../cli/command-format.js";
import { detectBinary, resolveNodeManagerOptions } from "./onboard-helpers.js";

// ---------------------------------------------------------------------------
// Skill → category mapping
// ---------------------------------------------------------------------------

const SKILL_CATEGORY: Record<string, string> = {
  "wallet-manager": "🔗",
  "token-swap": "🔗",
  "contract-deployer": "🔗",
  "nft-manager": "🔗",
  "agent-identity": "🔗",
  "defi-dashboard": "💰",
  defillama: "💰",
  "aave-bsc": "💰",
  debank: "💰",
  "market-data": "📊",
  coingecko: "📊",
  "whale-watcher": "📊",
  "gas-tracker": "📊",
  "macro-calendar": "📊",
  "four-meme": "📊",
  dune: "📊",
  "security-check": "🛡️",
  etherscan: "🛡️",
  discord: "💬",
  bird: "💬",
  github: "🛠️",
  tmux: "🛠️",
  "coding-agent": "🛠️",
  canvas: "🛠️",
};

/** Sort key — lower = earlier in the list */
const CATEGORY_RANK: Record<string, number> = {
  "🔗": 0, // Blockchain
  "💰": 1, // DeFi
  "📊": 2, // Market & Data
  "🛡️": 3, // Security
  "💬": 4, // Social
  "🛠️": 5, // Developer
  "📦": 6, // Other
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function summarizeInstallFailure(message: string): string | undefined {
  const cleaned = message.replace(/^Install failed(?:\s*\([^)]*\))?\s*:?\s*/i, "").trim();
  if (!cleaned) {
    return undefined;
  }
  const maxLen = 140;
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;
}

function formatSkillHint(skill: SkillStatusEntry): string {
  const parts: string[] = [];

  const desc = skill.description?.trim();
  if (desc) {
    parts.push(desc);
  }

  // Status indicator
  if (skill.eligible) {
    parts.push("✓ ready");
  } else if (skill.missing.env.length > 0) {
    parts.push(`needs ${skill.primaryEnv ?? "API key"}`);
  } else if (skill.missing.bins.length > 0) {
    parts.push(`needs ${skill.missing.bins.join(", ")}`);
  }

  const combined = parts.join(" — ");
  if (!combined) {
    return "";
  }
  const maxLen = 90;
  return combined.length > maxLen ? `${combined.slice(0, maxLen - 1)}…` : combined;
}

function skillSortKey(skill: SkillStatusEntry): number {
  const cat = SKILL_CATEGORY[skill.name] ?? "📦";
  return CATEGORY_RANK[cat] ?? 99;
}

function buildSkillOptions(skills: SkillStatusEntry[]) {
  const filtered = skills.filter((s) => !s.blockedByAllowlist && !s.disabled);
  const sorted = [...filtered].sort((a, b) => skillSortKey(a) - skillSortKey(b));
  return sorted.map((skill) => {
    const cat = SKILL_CATEGORY[skill.name] ?? "📦";
    return {
      value: skill.name,
      label: `${cat} ${skill.name}`,
      hint: formatSkillHint(skill),
    };
  });
}

function upsertSkillEntry(
  cfg: OpenClawConfig,
  skillKey: string,
  patch: { apiKey?: string; enabled?: boolean },
): OpenClawConfig {
  const entries = { ...cfg.skills?.entries };
  const existing = (entries[skillKey] as { apiKey?: string; enabled?: boolean } | undefined) ?? {};
  entries[skillKey] = { ...existing, ...patch };
  return {
    ...cfg,
    skills: {
      ...cfg.skills,
      entries,
    },
  };
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

export async function setupSkills(
  cfg: OpenClawConfig,
  workspaceDir: string,
  runtime: RuntimeEnv,
  prompter: WizardPrompter,
): Promise<OpenClawConfig> {
  const report = buildWorkspaceSkillStatus(workspaceDir, { config: cfg });

  // Build categorized, sorted options for selection UI
  const options = buildSkillOptions(report.skills);
  if (options.length === 0) {
    await prompter.note("No skills available to configure.", "Skills");
    return cfg;
  }

  const selectable = report.skills.filter((s) => !s.blockedByAllowlist && !s.disabled);

  // Pre-select eligible skills
  const initialValues = selectable.filter((s) => s.eligible).map((s) => s.name);

  const selected = await prompter.multiselect<string>({
    message: "Select skills to enable",
    options,
    initialValues,
  });

  const selectedSet = new Set(selected);

  // Mark deselected skills as disabled in config
  let next = cfg;
  for (const skill of selectable) {
    if (!selectedSet.has(skill.name)) {
      next = upsertSkillEntry(next, skill.skillKey, { enabled: false });
    }
  }

  // Homebrew prompt — only if selected skills need brew installs
  const needsBrewPrompt =
    process.platform !== "win32" &&
    report.skills
      .filter((s) => selectedSet.has(s.name))
      .some((skill) => skill.install.some((option) => option.kind === "brew")) &&
    !(await detectBinary("brew"));

  if (needsBrewPrompt) {
    await prompter.note(
      [
        "Many skill dependencies are shipped via Homebrew.",
        "Without brew, you'll need to build from source or download releases manually.",
      ].join("\n"),
      "Homebrew recommended",
    );
    const showBrewInstall = await prompter.confirm({
      message: "Show Homebrew install command?",
      initialValue: true,
    });
    if (showBrewInstall) {
      await prompter.note(
        [
          "Run:",
          '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
        ].join("\n"),
        "Homebrew install",
      );
    }
  }

  // Determine which selected skills need dependency installation
  const installable = report.skills.filter(
    (skill) =>
      selectedSet.has(skill.name) &&
      !skill.eligible &&
      skill.install.length > 0 &&
      skill.missing.bins.length > 0,
  );

  // Only ask for node manager if there are things to install
  if (installable.length > 0) {
    const nodeManager = (await prompter.select({
      message: "Preferred node manager for skill installs",
      options: resolveNodeManagerOptions(),
    })) as "npm" | "pnpm" | "bun";

    next = {
      ...next,
      skills: {
        ...next.skills,
        install: {
          ...next.skills?.install,
          nodeManager,
        },
      },
    };

    const toInstall = await prompter.multiselect({
      message: "Install missing skill dependencies",
      options: [
        {
          value: "__skip__",
          label: "Skip for now",
          hint: "Continue without installing dependencies",
        },
        ...installable.map((skill) => ({
          value: skill.name,
          label: `${skill.emoji ?? "🧩"} ${skill.name}`,
          hint: `needs ${skill.missing.bins.join(", ")}`,
        })),
      ],
    });

    const toInstallFiltered = toInstall.filter((name) => name !== "__skip__");
    for (const name of toInstallFiltered) {
      const target = installable.find((s) => s.name === name);
      if (!target || target.install.length === 0) {
        continue;
      }
      const installId = target.install[0]?.id;
      if (!installId) {
        continue;
      }
      const spin = prompter.progress(`Installing ${name}…`);
      const result = await installSkill({
        workspaceDir,
        skillName: target.name,
        installId,
        config: next,
      });
      const warnings = result.warnings ?? [];
      if (result.ok) {
        spin.stop(warnings.length > 0 ? `Installed ${name} (with warnings)` : `Installed ${name}`);
        for (const warning of warnings) {
          runtime.log(warning);
        }
        continue;
      }
      const code = result.code == null ? "" : ` (exit ${result.code})`;
      const detail = summarizeInstallFailure(result.message);
      spin.stop(`Install failed: ${name}${code}${detail ? ` — ${detail}` : ""}`);
      for (const warning of warnings) {
        runtime.log(warning);
      }
      if (result.stderr) {
        runtime.log(result.stderr.trim());
      } else if (result.stdout) {
        runtime.log(result.stdout.trim());
      }
      runtime.log(
        `Tip: run \`${formatCliCommand("cryptoclaw doctor")}\` to review skills + requirements.`,
      );
      runtime.log("Docs: https://docs.cryptoclaw.ai/skills");
    }
  }

  // --- API key setup ---
  const needsKey = report.skills.filter(
    (s) => selectedSet.has(s.name) && s.primaryEnv && s.missing.env.length > 0,
  );
  if (needsKey.length > 0) {
    const toSetup = await prompter.multiselect({
      message: "Set up API keys (required to enable these skills)",
      options: [
        {
          value: "__skip__",
          label: "Skip for now",
          hint: `Add keys later via ${formatCliCommand("cryptoclaw configure")}`,
        },
        ...needsKey.map((skill) => ({
          value: skill.skillKey,
          label: `${skill.emoji ?? "🔑"} ${skill.name}`,
          hint: skill.primaryEnv,
        })),
      ],
    });

    for (const skillKey of toSetup.filter((k) => k !== "__skip__")) {
      const skill = needsKey.find((s) => s.skillKey === skillKey);
      if (!skill?.primaryEnv) {
        continue;
      }
      const apiKey = String(
        await prompter.text({
          message: `Enter ${skill.primaryEnv}`,
          placeholder: `Paste your ${skill.name} API key`,
          validate: (value) => (value?.trim() ? undefined : "Required"),
        }),
      );
      next = upsertSkillEntry(next, skill.skillKey, { apiKey: apiKey.trim() });
    }
  }

  return next;
}
