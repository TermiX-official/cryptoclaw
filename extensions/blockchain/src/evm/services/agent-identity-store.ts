import fs from "node:fs";
import path from "node:path";

/** Persisted agent identity configuration. */
export type AgentIdentityConfig = {
  agentId: number;
  chainId: number;
  registryAddress: string;
  agentWallet: string;
  agentURI: string;
  registeredAt: string;
};

const IDENTITY_FILENAME = "agent-identity.json";

/** Read the persisted agent identity from disk. */
export function readAgentIdentity(stateDir: string): AgentIdentityConfig | null {
  const filePath = path.join(stateDir, IDENTITY_FILENAME);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as AgentIdentityConfig;
  } catch {
    return null;
  }
}

/** Write agent identity config to disk. */
export function writeAgentIdentity(stateDir: string, config: AgentIdentityConfig): void {
  const filePath = path.join(stateDir, IDENTITY_FILENAME);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), { mode: 0o600 });
}
