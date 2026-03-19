/**
 * zkVM Evaluator for ERC-8183 — runs Client's verification program on
 * Provider's deliverable inside a zkVM, generates a proof, settles on-chain.
 *
 * Full flow:
 *   1. Client creates Job with a verification program reference (IPFS CID)
 *   2. Provider submits deliverable (IPFS CID)
 *   3. Evaluator fetches both, runs program(deliverable) in zkVM
 *   4. zkVM produces proof: "program P on input D exited with code 0"
 *   5. Evaluator submits proof hash as `reason` → complete() or reject()
 *   6. Anyone can verify: download proof, verify on-chain or locally
 *
 * The proof guarantees the verification program actually ran on the
 * deliverable and produced the claimed result. No trust in the evaluator.
 */

import crypto from "node:crypto";
import { type Hash, toHex } from "viem";
import { execute, isSp1Available, isRisc0Available } from "../../../../../src/zkvm/executor.js";
import type {
  VerificationProgram,
  ZkvmEvaluateJobParams,
  ZkvmEvaluateJobResult,
} from "../../../../../src/zkvm/types.js";
import { ERC8183_ABI } from "./abi/erc8183.js";
import { getAcpAddress } from "./agentic-commerce-config.js";
import { getPublicClient, getWalletClient } from "./clients.js";

// --- Fetch deliverable content ---

async function fetchDeliverable(ref: string): Promise<string> {
  if (ref.startsWith("Qm") || ref.startsWith("bafy")) {
    const res = await fetch(`https://ipfs.io/ipfs/${ref}`);
    if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
    return res.text();
  }
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    const res = await fetch(ref);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.text();
  }
  return ref;
}

// --- Check backend availability ---

export async function getAvailableBackend(): Promise<"sp1" | "risc0" | "native"> {
  if (await isSp1Available()) return "sp1";
  if (await isRisc0Available()) return "risc0";
  return "native";
}

// --- Evaluate and settle ---

/**
 * Run the Client's verification program on the Provider's deliverable,
 * generate a ZK proof, and settle the ERC-8183 job on-chain.
 */
export async function evaluateAndSettleJob(
  privateKey: `0x${string}`,
  params: ZkvmEvaluateJobParams,
): Promise<ZkvmEvaluateJobResult> {
  const { jobId, chainId, program } = params;
  const acpAddress = getAcpAddress(chainId);
  const walletClient = getWalletClient(chainId, privateKey);
  const publicClient = getPublicClient(chainId);

  // 1. Fetch deliverable
  const deliverable = await fetchDeliverable(params.deliverableRef);

  // 2. Execute verification program in zkVM
  const result = await execute({
    program,
    deliverable,
    auxiliaryInputs: params.jobDescription
      ? { ZKVM_JOB_DESCRIPTION: params.jobDescription }
      : undefined,
  });

  // 3. Build reason — commit proof metadata for on-chain reference
  const reasonData = JSON.stringify({
    programHash: result.programHash,
    deliverableHash: result.deliverableHash,
    exitCode: result.exitCode,
    passed: result.passed,
    backend: program.backend,
    publicOutputs: result.publicOutputs,
    proverTimeMs: result.proverTimeMs,
    stdoutHash: crypto.createHash("sha256").update(result.stdout).digest("hex"),
  });
  const reasonHash = "0x" + crypto.createHash("sha256").update(reasonData).digest("hex");
  const reasonBytes = toHex(new TextEncoder().encode(reasonData));

  // 4. Settle on-chain
  let txHash: Hash;
  if (result.passed) {
    txHash = await walletClient.writeContract({
      address: acpAddress,
      abi: ERC8183_ABI,
      functionName: "complete",
      args: [BigInt(jobId), reasonBytes, "0x"],
    });
  } else {
    txHash = await walletClient.writeContract({
      address: acpAddress,
      abi: ERC8183_ABI,
      functionName: "reject",
      args: [BigInt(jobId), reasonBytes, "0x"],
    });
  }

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    passed: result.passed,
    exitCode: result.exitCode,
    stdout: result.stdout,
    decision: result.passed ? "complete" : "reject",
    txHash,
    reasonHash,
    proverTimeMs: result.proverTimeMs,
  };
}
