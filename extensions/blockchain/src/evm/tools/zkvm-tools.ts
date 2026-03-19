/**
 * zkVM Evaluator tools for ERC-8183 jobs.
 *
 * Runs a Client-provided verification program on the Provider's deliverable
 * inside a zkVM, generates a ZK proof of the result, and settles on-chain.
 */

import type { OpenClawPluginApi } from "cryptoclaw/plugin-sdk";
import { isSp1Available, isRisc0Available } from "../../../../../src/zkvm/executor.js";
import type { VerificationProgram } from "../../../../../src/zkvm/types.js";
import { resolveActivePrivateKey } from "../../wallet/active-wallet.js";
import type { WalletManager } from "../../wallet/wallet-manager.js";
import { resolveChainId, getChain } from "../chains.js";
import { getJob } from "../services/agentic-commerce.js";
import { evaluateAndSettleJob, getAvailableBackend } from "../services/zkvm-evaluator.js";

const ERC8183_DEFAULT_CHAIN = 8453;

function resolveZkChain(network?: string): number {
  return network ? resolveChainId(network) : ERC8183_DEFAULT_CHAIN;
}

export function registerZkvmTools(api: OpenClawPluginApi, walletManager: WalletManager) {
  // --- Evaluate Job with zkVM ---
  api.registerTool({
    name: "zkvm_evaluate_job",
    description:
      "Evaluate an ERC-8183 job by running the Client's verification program " +
      "on the Provider's deliverable inside a zkVM. Generates a ZK proof " +
      "that the program produced the result, then settles the job on-chain. " +
      "The proof is mathematically verifiable — no trust in the evaluator needed. " +
      "Supports SP1, RISC Zero, or native (dev mode) backends.",
    parameters: {
      type: "object",
      properties: {
        jobId: {
          type: "string",
          description: "ERC-8183 job ID to evaluate",
        },
        programRef: {
          type: "string",
          description:
            "Verification program reference (IPFS CID, URL, or local path to ELF binary)",
        },
        programHash: {
          type: "string",
          description:
            "Expected SHA-256 hash of the program binary (optional, for integrity check)",
        },
        deliverableRef: {
          type: "string",
          description:
            "Deliverable reference (IPFS CID, URL, or inline content). If omitted, fetched from job data.",
        },
        backend: {
          type: "string",
          description:
            'zkVM backend: "sp1", "risc0", or "native" (default: auto-detect best available)',
        },
        network: {
          type: "string",
          description: 'Network (default: "base")',
        },
      },
      required: ["jobId", "programRef"],
    },
    async execute(
      _id: string,
      params: {
        jobId: string;
        programRef: string;
        programHash?: string;
        deliverableRef?: string;
        backend?: string;
        network?: string;
      },
    ) {
      const chainId = resolveZkChain(params.network);

      // Get job info
      const job = await getJob(params.jobId, chainId);
      if (job.status !== "Submitted") {
        throw new Error(
          `Job #${params.jobId} is "${job.status}". Must be "Submitted" to evaluate.`,
        );
      }

      // Resolve backend
      const backend =
        (params.backend as "sp1" | "risc0" | "native") ?? (await getAvailableBackend());

      const program: VerificationProgram = {
        name: params.programRef.split("/").pop() ?? "verifier",
        programRef: params.programRef,
        programHash: params.programHash ?? "",
        backend,
      };

      const privateKey = await resolveActivePrivateKey(walletManager);

      const result = await evaluateAndSettleJob(privateKey, {
        jobId: params.jobId,
        chainId,
        deliverableRef: params.deliverableRef ?? job.description,
        program,
        jobDescription: job.description,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: result.decision,
                jobId: params.jobId,
                exitCode: result.exitCode,
                passed: result.passed,
                stdout: result.stdout.slice(0, 500),
                backend,
                proverTimeMs: result.proverTimeMs,
                txHash: result.txHash,
                reasonHash: result.reasonHash,
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

  // --- Check zkVM Status ---
  api.registerTool({
    name: "zkvm_status",
    description: "Check which zkVM backends are available for running verification programs.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute() {
      const [sp1, risc0] = await Promise.all([isSp1Available(), isRisc0Available()]);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                backends: {
                  sp1: {
                    installed: sp1,
                    install: sp1 ? null : "curl -L https://sp1.succinct.xyz | bash && sp1up",
                  },
                  risc0: {
                    installed: risc0,
                    install: risc0
                      ? null
                      : "curl -L https://risczero.com/install | bash && rzup install",
                  },
                  native: {
                    installed: true,
                    note: "Always available. No ZK proof generated (dev/testing only).",
                  },
                },
                recommended: sp1 ? "sp1" : risc0 ? "risc0" : "native",
                onChainVerificationCost: {
                  groth16: "~200k gas (~$0.004 on Base L2)",
                  plonk: "~300k gas (~$0.006 on Base L2)",
                },
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
