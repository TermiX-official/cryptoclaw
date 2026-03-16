/**
 * ERC-8183 Agentic Commerce — core service functions.
 *
 * Provides on-chain job creation, funding, submission, evaluation,
 * and refund operations via the Agentic Commerce Protocol.
 */

import { type Hash, decodeEventLog, formatUnits, parseUnits, toHex } from "viem";
import { ERC20_ABI } from "./abi/erc20.js";
import { ERC8183_ABI } from "./abi/erc8183.js";
import { getAcpAddress, getPaymentConfig } from "./agentic-commerce-config.js";
import { getPublicClient, getWalletClient } from "./clients.js";

// --- Types ---

const JOB_STATUS_LABELS = [
  "Open",
  "Funded",
  "Submitted",
  "Completed",
  "Rejected",
  "Expired",
] as const;
type JobStatusLabel = (typeof JOB_STATUS_LABELS)[number];

export type JobInfo = {
  jobId: string;
  client: string;
  provider: string;
  evaluator: string;
  hook: string;
  token: string;
  budget: string;
  budgetFormatted: string;
  expiredAt: string;
  status: JobStatusLabel;
  description: string;
  chainId: number;
};

export type JobTxResult = {
  jobId: string;
  txHash: Hash;
  chainId: number;
};

// --- Helpers ---

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function parseExpiry(expiredAt: string): bigint {
  // Accept ISO date string or unix timestamp
  if (expiredAt.includes("T") || expiredAt.includes("-")) {
    const ms = new Date(expiredAt).getTime();
    if (Number.isNaN(ms)) {
      throw new Error(`Invalid date: ${expiredAt}`);
    }
    return BigInt(Math.floor(ms / 1000));
  }
  return BigInt(expiredAt);
}

function toJobStatus(raw: number): JobStatusLabel {
  return JOB_STATUS_LABELS[raw] ?? (`Unknown(${raw})` as JobStatusLabel);
}

// --- Create Job ---

export async function createJob(
  privateKey: `0x${string}`,
  params: {
    provider?: string;
    evaluator: string;
    expiredAt: string;
    description: string;
    hook?: string;
    chainId: number;
  },
): Promise<JobTxResult> {
  const { chainId } = params;
  const acpAddress = getAcpAddress(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  const expiredAt = parseExpiry(params.expiredAt);

  const txHash = await walletClient.writeContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "createJob",
    args: [
      (params.provider ?? ZERO_ADDRESS) as `0x${string}`,
      params.evaluator as `0x${string}`,
      expiredAt,
      params.description,
      (params.hook ?? ZERO_ADDRESS) as `0x${string}`,
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Extract jobId from JobCreated event
  let jobId: string | undefined;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: ERC8183_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "JobCreated") {
        jobId = String((decoded.args as { jobId: bigint }).jobId);
        break;
      }
    } catch {
      // Not a matching event
    }
  }

  if (!jobId) {
    throw new Error("createJob tx succeeded but no JobCreated event found");
  }

  return { jobId, txHash, chainId };
}

// --- Set Provider ---

export async function setProvider(
  privateKey: `0x${string}`,
  jobId: string,
  provider: string,
  chainId: number,
): Promise<{ txHash: Hash }> {
  const acpAddress = getAcpAddress(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  const txHash = await walletClient.writeContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "setProvider",
    args: [BigInt(jobId), provider as `0x${string}`, "0x"],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}

// --- Set Budget ---

export async function setBudget(
  privateKey: `0x${string}`,
  jobId: string,
  amount: string,
  chainId: number,
): Promise<{ txHash: Hash; budgetRaw: string }> {
  const acpAddress = getAcpAddress(chainId);
  const payment = getPaymentConfig(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  const budgetRaw = parseUnits(amount, payment.decimals);

  const txHash = await walletClient.writeContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "setBudget",
    args: [BigInt(jobId), budgetRaw, "0x"],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash, budgetRaw: budgetRaw.toString() };
}

// --- Fund Job ---

/**
 * Fund a job: approve the payment token, then call fund().
 * Handles ERC-20 approval automatically.
 */
export async function fundJob(
  privateKey: `0x${string}`,
  jobId: string,
  chainId: number,
): Promise<{ txHash: Hash; approvalTxHash?: Hash; amount: string }> {
  const acpAddress = getAcpAddress(chainId);
  const payment = getPaymentConfig(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  // Read the job to get the budget
  const job = (await publicClient.readContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "getJob",
    args: [BigInt(jobId)],
  })) as { budget: bigint };

  const budget = job.budget;
  if (budget === 0n) {
    throw new Error("Job budget is 0. Set budget first with job_set_budget.");
  }

  // Check current allowance
  const account = walletClient.account;
  if (!account) {
    throw new Error("No account on wallet client");
  }

  const currentAllowance = (await publicClient.readContract({
    address: payment.token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account.address, acpAddress],
  })) as bigint;

  // Approve if needed
  let approvalTxHash: Hash | undefined;
  if (currentAllowance < budget) {
    approvalTxHash = await walletClient.writeContract({
      address: payment.token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [acpAddress, budget],
    });
    await publicClient.waitForTransactionReceipt({ hash: approvalTxHash });
  }

  // Fund the job (expectedBudget = budget for slippage protection)
  const txHash = await walletClient.writeContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "fund",
    args: [BigInt(jobId), budget, "0x"],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    approvalTxHash,
    amount: formatUnits(budget, payment.decimals),
  };
}

// --- Submit Deliverable ---

export async function submitJob(
  privateKey: `0x${string}`,
  jobId: string,
  deliverable: string,
  chainId: number,
): Promise<{ txHash: Hash }> {
  const acpAddress = getAcpAddress(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  // deliverable is a hex string or plain text (we encode plain text to hex)
  const deliverableBytes = deliverable.startsWith("0x")
    ? (deliverable as `0x${string}`)
    : toHex(new TextEncoder().encode(deliverable));

  const txHash = await walletClient.writeContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "submit",
    args: [BigInt(jobId), deliverableBytes, "0x"],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}

// --- Complete Job ---

export async function completeJob(
  privateKey: `0x${string}`,
  jobId: string,
  reason: string,
  chainId: number,
): Promise<{ txHash: Hash }> {
  const acpAddress = getAcpAddress(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  const reasonBytes = reason.startsWith("0x")
    ? (reason as `0x${string}`)
    : toHex(new TextEncoder().encode(reason));

  const txHash = await walletClient.writeContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "complete",
    args: [BigInt(jobId), reasonBytes, "0x"],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}

// --- Reject Job ---

export async function rejectJob(
  privateKey: `0x${string}`,
  jobId: string,
  reason: string,
  chainId: number,
): Promise<{ txHash: Hash }> {
  const acpAddress = getAcpAddress(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  const reasonBytes = reason.startsWith("0x")
    ? (reason as `0x${string}`)
    : toHex(new TextEncoder().encode(reason));

  const txHash = await walletClient.writeContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "reject",
    args: [BigInt(jobId), reasonBytes, "0x"],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}

// --- Claim Refund ---

export async function claimRefund(
  privateKey: `0x${string}`,
  jobId: string,
  chainId: number,
): Promise<{ txHash: Hash }> {
  const acpAddress = getAcpAddress(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  const txHash = await walletClient.writeContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "claimRefund",
    args: [BigInt(jobId)],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return { txHash };
}

// --- Query Job ---

export async function getJob(jobId: string, chainId: number): Promise<JobInfo> {
  const acpAddress = getAcpAddress(chainId);
  const publicClient = getPublicClient(chainId);
  const payment = getPaymentConfig(chainId);

  const [job, description] = await Promise.all([
    publicClient.readContract({
      address: acpAddress,
      abi: ERC8183_ABI,
      functionName: "getJob",
      args: [BigInt(jobId)],
    }) as Promise<{
      client: string;
      provider: string;
      evaluator: string;
      hook: string;
      token: string;
      budget: bigint;
      expiredAt: bigint;
      status: number;
    }>,
    publicClient.readContract({
      address: acpAddress,
      abi: ERC8183_ABI,
      functionName: "getDescription",
      args: [BigInt(jobId)],
    }) as Promise<string>,
  ]);

  return {
    jobId,
    client: job.client,
    provider: job.provider,
    evaluator: job.evaluator,
    hook: job.hook,
    token: job.token,
    budget: job.budget.toString(),
    budgetFormatted: `${formatUnits(job.budget, payment.decimals)} ${payment.symbol}`,
    expiredAt: new Date(Number(job.expiredAt) * 1000).toISOString(),
    status: toJobStatus(job.status),
    description,
    chainId,
  };
}

// --- List Jobs by Address ---

/**
 * List jobs where the given address is client, provider, or evaluator.
 * Scans JobCreated events from block 0.
 */
export async function listJobs(
  address: `0x${string}`,
  role: "client" | "provider" | "all",
  chainId: number,
): Promise<JobInfo[]> {
  const acpAddress = getAcpAddress(chainId);
  const publicClient = getPublicClient(chainId);

  // Get total job count
  const totalJobs = (await publicClient.readContract({
    address: acpAddress,
    abi: ERC8183_ABI,
    functionName: "jobCount",
  })) as bigint;

  if (totalJobs === 0n) {
    return [];
  }

  // Scan recent jobs (up to 100) to find matching ones
  const limit = totalJobs > 100n ? 100n : totalJobs;
  const startId = totalJobs - limit + 1n;
  const jobs: JobInfo[] = [];

  for (let id = totalJobs; id >= startId; id--) {
    const info = await getJob(id.toString(), chainId);

    const isMatch =
      role === "all"
        ? info.client.toLowerCase() === address.toLowerCase() ||
          info.provider.toLowerCase() === address.toLowerCase() ||
          info.evaluator.toLowerCase() === address.toLowerCase()
        : role === "client"
          ? info.client.toLowerCase() === address.toLowerCase()
          : info.provider.toLowerCase() === address.toLowerCase();

    if (isMatch) {
      jobs.push(info);
    }
  }

  return jobs;
}
