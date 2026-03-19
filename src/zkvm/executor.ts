/**
 * zkVM Executor — runs verification programs inside a zkVM and generates proofs.
 *
 * Supports three backends:
 *   - SP1 (Succinct): Fastest, RISC-V based, `sp1` CLI
 *   - RISC Zero: Mature, RISC-V based, optional Bonsai remote prover
 *   - Native: No ZK proof, runs program directly (dev/testing only)
 *
 * The verification program is a compiled RISC-V ELF binary that:
 *   - Reads deliverable content from stdin
 *   - Reads auxiliary inputs from env vars
 *   - Outputs evaluation details to stdout
 *   - Exits with code 0 (pass) or non-zero (fail)
 *
 * The zkVM wraps this execution in a ZK proof, committing:
 *   - Program hash (which program ran)
 *   - Deliverable hash (what was evaluated)
 *   - Exit code (pass/fail)
 *   - Stdout hash (evaluation details)
 */

import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { VerificationProgram, ZkvmExecuteParams, ZkvmExecuteResult } from "./types.js";

const execFileAsync = promisify(execFile);

// --- Backend availability ---

export async function isSp1Available(): Promise<boolean> {
  try {
    await execFileAsync("cargo", ["prove", "--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function isRisc0Available(): Promise<boolean> {
  try {
    await execFileAsync("r0vm", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

// --- Fetch content ---

async function fetchBinary(ref: string): Promise<Buffer> {
  if (ref.startsWith("Qm") || ref.startsWith("bafy")) {
    const res = await fetch(`https://ipfs.io/ipfs/${ref}`);
    if (!res.ok) {
      throw new Error(`IPFS fetch failed: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    const res = await fetch(ref);
    if (!res.ok) {
      throw new Error(`HTTP fetch failed: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFileSync(ref);
}

// --- Hash helpers ---

function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// --- Execute in zkVM ---

/**
 * Execute a verification program inside the zkVM and generate a proof.
 */
export async function execute(params: ZkvmExecuteParams): Promise<ZkvmExecuteResult> {
  const { program, deliverable } = params;
  const deliverableStr =
    typeof deliverable === "string" ? deliverable : new TextDecoder().decode(deliverable);
  const deliverableHash = sha256(deliverableStr);

  switch (program.backend) {
    case "sp1":
      return executeSp1(program, deliverableStr, deliverableHash, params.auxiliaryInputs);
    case "risc0":
      return executeRisc0(program, deliverableStr, deliverableHash, params.auxiliaryInputs);
    case "native":
      return executeNative(program, deliverableStr, deliverableHash, params.auxiliaryInputs);
    default: {
      const _exhaustive: never = program.backend;
      throw new Error(`Unknown zkVM backend: ${String(_exhaustive)}`);
    }
  }
}

// --- SP1 Backend ---

async function executeSp1(
  program: VerificationProgram,
  deliverable: string,
  deliverableHash: string,
  auxiliaryInputs?: Record<string, string>,
): Promise<ZkvmExecuteResult> {
  const startTime = Date.now();
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "zkvm-sp1-"));

  try {
    // Fetch program binary
    const programBin = await fetchBinary(program.programRef);
    const programPath = path.join(tmpDir, "program.elf");
    fs.writeFileSync(programPath, programBin);

    // Verify program hash
    const actualHash = sha256(programBin);
    if (program.programHash && actualHash !== program.programHash) {
      throw new Error(`Program hash mismatch: expected ${program.programHash}, got ${actualHash}`);
    }

    // Write deliverable as input
    const inputPath = path.join(tmpDir, "input.bin");
    fs.writeFileSync(inputPath, deliverable);

    // Write auxiliary inputs
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ZKVM_DELIVERABLE_HASH: deliverableHash,
      ...auxiliaryInputs,
    };

    // Run SP1 prover
    // sp1 prove --elf <program> --stdin <input> --proof <output> --system <groth16|plonk>
    const proofPath = path.join(tmpDir, "proof.bin");
    const proofSystem = program.proofSystem ?? "groth16";

    const { stdout, stderr } = await execFileAsync(
      "cargo",
      [
        "prove",
        "prove",
        "--elf",
        programPath,
        "--stdin",
        inputPath,
        "--proof",
        proofPath,
        "--system",
        proofSystem,
      ],
      { env, timeout: 600_000 }, // 10 min timeout for proving
    );

    // Read proof
    const proofData = fs.existsSync(proofPath) ? fs.readFileSync(proofPath) : Buffer.alloc(0);
    const proofHex = proofData.toString("hex");

    // Parse exit code from SP1 output
    const exitCode = stderr.includes("FAIL") || stderr.includes("panic") ? 1 : 0;

    return {
      exitCode,
      passed: exitCode === 0,
      stdout: stdout.trim(),
      proof: proofHex,
      publicOutputs: [actualHash, deliverableHash, String(exitCode)],
      programHash: actualHash,
      deliverableHash,
      proverTimeMs: Date.now() - startTime,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// --- RISC Zero Backend ---

async function executeRisc0(
  program: VerificationProgram,
  deliverable: string,
  deliverableHash: string,
  auxiliaryInputs?: Record<string, string>,
): Promise<ZkvmExecuteResult> {
  const startTime = Date.now();
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "zkvm-r0-"));

  try {
    const programBin = await fetchBinary(program.programRef);
    const programPath = path.join(tmpDir, "program.elf");
    fs.writeFileSync(programPath, programBin);

    const actualHash = sha256(programBin);
    if (program.programHash && actualHash !== program.programHash) {
      throw new Error(`Program hash mismatch: expected ${program.programHash}, got ${actualHash}`);
    }

    const inputPath = path.join(tmpDir, "input.bin");
    fs.writeFileSync(inputPath, deliverable);

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ZKVM_DELIVERABLE_HASH: deliverableHash,
      // Enable Bonsai remote prover if API key is set
      ...(process.env.BONSAI_API_KEY ? { BONSAI_API_URL: "https://api.bonsai.xyz" } : {}),
      ...auxiliaryInputs,
    };

    const proofPath = path.join(tmpDir, "proof.bin");

    const { stdout, stderr } = await execFileAsync(
      "r0vm",
      ["--elf", programPath, "--input", inputPath, "--proof-out", proofPath],
      { env, timeout: 600_000 },
    );

    const proofData = fs.existsSync(proofPath) ? fs.readFileSync(proofPath) : Buffer.alloc(0);
    const exitCode = stderr.includes("FAIL") || stderr.includes("panic") ? 1 : 0;

    return {
      exitCode,
      passed: exitCode === 0,
      stdout: stdout.trim(),
      proof: proofData.toString("hex"),
      publicOutputs: [actualHash, deliverableHash, String(exitCode)],
      programHash: actualHash,
      deliverableHash,
      proverTimeMs: Date.now() - startTime,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// --- Native Backend (dev/testing, no ZK proof) ---

async function executeNative(
  program: VerificationProgram,
  deliverable: string,
  deliverableHash: string,
  auxiliaryInputs?: Record<string, string>,
): Promise<ZkvmExecuteResult> {
  const startTime = Date.now();
  const tmpDir = fs.mkdtempSync(path.join("/tmp", "zkvm-native-"));

  try {
    const programBin = await fetchBinary(program.programRef);
    const programPath = path.join(tmpDir, "program");
    fs.writeFileSync(programPath, programBin);
    fs.chmodSync(programPath, 0o755);

    const actualHash = sha256(programBin);
    if (program.programHash && actualHash !== program.programHash) {
      throw new Error(`Program hash mismatch: expected ${program.programHash}, got ${actualHash}`);
    }

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ZKVM_DELIVERABLE_HASH: deliverableHash,
      ...auxiliaryInputs,
    };

    let stdout = "";
    let exitCode = 0;

    try {
      const result = await execFileAsync(programPath, [], {
        input: deliverable,
        env,
        timeout: 60_000,
      });
      stdout = result.stdout;
    } catch (err: unknown) {
      const execError = err as { code?: number; stdout?: string; stderr?: string };
      exitCode = execError.code ?? 1;
      stdout = execError.stdout ?? "";
    }

    return {
      exitCode,
      passed: exitCode === 0,
      stdout: stdout.trim(),
      proof: "", // No proof in native mode
      publicOutputs: [actualHash, deliverableHash, String(exitCode)],
      programHash: actualHash,
      deliverableHash,
      proverTimeMs: Date.now() - startTime,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
