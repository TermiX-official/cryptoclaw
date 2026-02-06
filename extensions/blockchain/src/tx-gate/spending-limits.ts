import fs from "node:fs";
import path from "node:path";

export type SpendingLimitsConfig = {
  maxTxValueUsd: number;
  dailyLimitUsd: number;
  confirmAll: boolean;
};

export const DEFAULT_SPENDING_LIMITS: SpendingLimitsConfig = {
  maxTxValueUsd: 1000,
  dailyLimitUsd: 5000,
  confirmAll: true,
};

type SpendingLogEntry = {
  timestamp: string;
  toolName: string;
  valueUsd: number;
  txHash?: string;
  network: string;
};

/**
 * Track daily spending and enforce limits.
 */
export class SpendingTracker {
  private readonly logPath: string;

  constructor(stateDir: string) {
    const walletsDir = path.join(stateDir, "wallets");
    if (!fs.existsSync(walletsDir)) {
      fs.mkdirSync(walletsDir, { recursive: true });
    }
    this.logPath = path.join(walletsDir, "spending-log.jsonl");
  }

  /** Log a spending event. */
  logSpend(entry: SpendingLogEntry): void {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(this.logPath, line);
  }

  /** Get total USD spent today. */
  getDailyTotal(): number {
    if (!fs.existsSync(this.logPath)) return 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const lines = fs.readFileSync(this.logPath, "utf8").trim().split("\n");
    let total = 0;
    for (const line of lines) {
      if (!line) continue;
      try {
        const entry = JSON.parse(line) as SpendingLogEntry;
        if (new Date(entry.timestamp).getTime() >= todayMs) {
          total += entry.valueUsd;
        }
      } catch {
        // Skip malformed lines
      }
    }
    return total;
  }

  /** Check if a transaction would exceed spending limits. */
  checkLimits(
    valueUsd: number,
    limits: SpendingLimitsConfig,
  ): { allowed: boolean; reason?: string } {
    if (valueUsd > limits.maxTxValueUsd) {
      return {
        allowed: false,
        reason: `Transaction value ($${valueUsd.toFixed(2)}) exceeds per-transaction limit ($${limits.maxTxValueUsd})`,
      };
    }

    const dailyTotal = this.getDailyTotal();
    if (dailyTotal + valueUsd > limits.dailyLimitUsd) {
      return {
        allowed: false,
        reason: `Transaction would exceed daily limit. Spent today: $${dailyTotal.toFixed(2)}, limit: $${limits.dailyLimitUsd}`,
      };
    }

    return { allowed: true };
  }
}
