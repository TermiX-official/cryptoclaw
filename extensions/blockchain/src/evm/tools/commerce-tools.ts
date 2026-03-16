import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import { resolveActivePrivateKey } from "../../wallet/active-wallet.js";
import type { WalletManager } from "../../wallet/wallet-manager.js";
import { DEFAULT_CHAIN_ID, resolveChainId, getChain } from "../chains.js";
import { isErc8183Supported, getPaymentConfig } from "../services/agentic-commerce-config.js";
import {
  createJob,
  setProvider,
  setBudget,
  fundJob,
  submitJob,
  completeJob,
  rejectJob,
  claimRefund,
  getJob,
  listJobs,
} from "../services/agentic-commerce.js";

/** Default to Base for ERC-8183 (primary deployment chain). */
const ERC8183_DEFAULT_CHAIN = 8453; // Base Mainnet

function resolveErc8183Chain(network?: string): number {
  if (!network) {
    return ERC8183_DEFAULT_CHAIN;
  }
  const chainId = resolveChainId(network);
  if (!isErc8183Supported(chainId)) {
    throw new Error(
      `ERC-8183 is not deployed on ${network} (chain ${chainId}). Use "base" or "base-sepolia".`,
    );
  }
  return chainId;
}

export function registerCommerceTools(api: OpenClawPluginApi, walletManager: WalletManager) {
  // --- Create Job ---
  api.registerTool({
    name: "job_create",
    description:
      "Create an ERC-8183 agentic commerce job. " +
      "Specify an evaluator (required), optionally a provider and deadline. " +
      "Payment token is USDC on Base.",
    parameters: {
      type: "object",
      properties: {
        evaluator: {
          type: "string",
          description: "Evaluator address (0x...) — the trusted judge for this job",
        },
        description: {
          type: "string",
          description: "Human-readable job description",
        },
        expiredAt: {
          type: "string",
          description: "Expiry time as ISO date (e.g. 2026-04-01T00:00:00Z) or unix timestamp",
        },
        provider: {
          type: "string",
          description: "Provider address (0x...). Omit for open job (assign later)",
        },
        hook: {
          type: "string",
          description: "Optional hook contract address for custom logic",
        },
        network: {
          type: "string",
          description: 'Network (default: "base"). Must have ERC-8183 deployment.',
        },
      },
      required: ["evaluator", "description", "expiredAt"],
    },
    async execute(
      _id: string,
      params: {
        evaluator: string;
        description: string;
        expiredAt: string;
        provider?: string;
        hook?: string;
        network?: string;
      },
    ) {
      const chainId = resolveErc8183Chain(params.network);
      const privateKey = await resolveActivePrivateKey(walletManager);

      const result = await createJob(privateKey, {
        evaluator: params.evaluator,
        description: params.description,
        expiredAt: params.expiredAt,
        provider: params.provider,
        hook: params.hook,
        chainId,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "created",
                jobId: result.jobId,
                txHash: result.txHash,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Set Provider ---
  api.registerTool({
    name: "job_set_provider",
    description:
      "Assign or change the provider for a job (Open state only). " +
      "Only the client can call this.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID" },
        provider: { type: "string", description: "New provider address (0x...)" },
        network: { type: "string", description: 'Network (default: "base")' },
      },
      required: ["jobId", "provider"],
    },
    async execute(_id: string, params: { jobId: string; provider: string; network?: string }) {
      const chainId = resolveErc8183Chain(params.network);
      const privateKey = await resolveActivePrivateKey(walletManager);

      const result = await setProvider(privateKey, params.jobId, params.provider, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "provider_set",
                jobId: params.jobId,
                provider: params.provider,
                txHash: result.txHash,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Set Budget ---
  api.registerTool({
    name: "job_set_budget",
    description:
      "Set or negotiate the job budget (Open state only). " +
      "Both client and provider can call this to negotiate. " +
      'Amount is in USDC (e.g. "100" = 100 USDC).',
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID" },
        amount: { type: "string", description: 'Budget amount in USDC (e.g. "100")' },
        network: { type: "string", description: 'Network (default: "base")' },
      },
      required: ["jobId", "amount"],
    },
    async execute(_id: string, params: { jobId: string; amount: string; network?: string }) {
      const chainId = resolveErc8183Chain(params.network);
      const privateKey = await resolveActivePrivateKey(walletManager);
      const payment = getPaymentConfig(chainId);

      const result = await setBudget(privateKey, params.jobId, params.amount, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "budget_set",
                jobId: params.jobId,
                amount: `${params.amount} ${payment.symbol}`,
                txHash: result.txHash,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Fund Job ---
  api.registerTool({
    name: "job_fund",
    description:
      "Lock USDC into escrow for a job (Open → Funded). " +
      "Automatically handles ERC-20 approval. Only the client can fund.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID to fund" },
        network: { type: "string", description: 'Network (default: "base")' },
      },
      required: ["jobId"],
    },
    async execute(_id: string, params: { jobId: string; network?: string }) {
      const chainId = resolveErc8183Chain(params.network);
      const privateKey = await resolveActivePrivateKey(walletManager);

      const result = await fundJob(privateKey, params.jobId, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "funded",
                jobId: params.jobId,
                amount: result.amount,
                txHash: result.txHash,
                approvalTxHash: result.approvalTxHash ?? null,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Submit Deliverable ---
  api.registerTool({
    name: "job_submit",
    description:
      "Submit a deliverable for a funded job (Funded → Submitted). " +
      "Only the provider can submit. Deliverable should be an IPFS CID or content hash.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID" },
        deliverable: {
          type: "string",
          description: "IPFS CID, content hash (0x...), or deliverable reference",
        },
        network: { type: "string", description: 'Network (default: "base")' },
      },
      required: ["jobId", "deliverable"],
    },
    async execute(_id: string, params: { jobId: string; deliverable: string; network?: string }) {
      const chainId = resolveErc8183Chain(params.network);
      const privateKey = await resolveActivePrivateKey(walletManager);

      const result = await submitJob(privateKey, params.jobId, params.deliverable, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "submitted",
                jobId: params.jobId,
                deliverable: params.deliverable,
                txHash: result.txHash,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Complete Job ---
  api.registerTool({
    name: "job_complete",
    description:
      "Approve a submitted job, releasing escrow to provider (Submitted → Completed). " +
      "Only the evaluator can call this.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID" },
        reason: {
          type: "string",
          description: "Evaluation reason — IPFS CID or hash of evaluation report",
        },
        network: { type: "string", description: 'Network (default: "base")' },
      },
      required: ["jobId", "reason"],
    },
    async execute(_id: string, params: { jobId: string; reason: string; network?: string }) {
      const chainId = resolveErc8183Chain(params.network);
      const privateKey = await resolveActivePrivateKey(walletManager);

      const result = await completeJob(privateKey, params.jobId, params.reason, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "completed",
                jobId: params.jobId,
                reason: params.reason,
                txHash: result.txHash,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Reject Job ---
  api.registerTool({
    name: "job_reject",
    description:
      "Reject a job with a reason. " +
      "Client can reject when Open (no refund needed). " +
      "Evaluator can reject when Funded or Submitted (triggers refund to client).",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID" },
        reason: { type: "string", description: "Rejection reason — hash or description" },
        network: { type: "string", description: 'Network (default: "base")' },
      },
      required: ["jobId", "reason"],
    },
    async execute(_id: string, params: { jobId: string; reason: string; network?: string }) {
      const chainId = resolveErc8183Chain(params.network);
      const privateKey = await resolveActivePrivateKey(walletManager);

      const result = await rejectJob(privateKey, params.jobId, params.reason, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "rejected",
                jobId: params.jobId,
                reason: params.reason,
                txHash: result.txHash,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Claim Refund ---
  api.registerTool({
    name: "job_claim_refund",
    description:
      "Claim refund for an expired job. Permissionless — anyone can trigger after expiry. " +
      "Refunds escrowed funds to the client.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID" },
        network: { type: "string", description: 'Network (default: "base")' },
      },
      required: ["jobId"],
    },
    async execute(_id: string, params: { jobId: string; network?: string }) {
      const chainId = resolveErc8183Chain(params.network);
      const privateKey = await resolveActivePrivateKey(walletManager);

      const result = await claimRefund(privateKey, params.jobId, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "refunded",
                jobId: params.jobId,
                txHash: result.txHash,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- Query Job ---
  api.registerTool({
    name: "job_query",
    description:
      "Query a job's details by ID — status, client, provider, evaluator, budget, deadline.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Job ID to query" },
        network: { type: "string", description: 'Network (default: "base")' },
      },
      required: ["jobId"],
    },
    async execute(_id: string, params: { jobId: string; network?: string }) {
      const chainId = resolveErc8183Chain(params.network);
      const info = await getJob(params.jobId, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                jobId: info.jobId,
                status: info.status,
                client: info.client,
                provider: info.provider,
                evaluator: info.evaluator,
                budget: info.budgetFormatted,
                expiredAt: info.expiredAt,
                description: info.description,
                hook: info.hook,
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });

  // --- List Jobs ---
  api.registerTool({
    name: "job_list",
    description:
      "List ERC-8183 jobs related to the active wallet. " +
      "Filter by role: client (jobs you created), provider (jobs you work on), or all.",
    parameters: {
      type: "object",
      properties: {
        role: {
          type: "string",
          description: 'Filter: "client", "provider", or "all" (default: "all")',
        },
        network: { type: "string", description: 'Network (default: "base")' },
      },
    },
    async execute(_id: string, params: { role?: string; network?: string }) {
      const chainId = resolveErc8183Chain(params.network);
      const address = walletManager.getActiveAddress();
      if (!address) {
        throw new Error("No active wallet");
      }

      const role = (params.role ?? "all") as "client" | "provider" | "all";
      const jobs = await listJobs(address as `0x${string}`, role, chainId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                address,
                role,
                count: jobs.length,
                jobs: jobs.map((j) => ({
                  jobId: j.jobId,
                  status: j.status,
                  budget: j.budgetFormatted,
                  description: j.description.slice(0, 100),
                  expiredAt: j.expiredAt,
                })),
                network: getChain(chainId).name,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  });
}
