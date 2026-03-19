/**
 * zkVM Evaluator — type definitions.
 *
 * A zkVM (zero-knowledge virtual machine) executes an arbitrary program
 * and generates a proof that the program ran correctly with specific I/O.
 *
 * In ERC-8183 context:
 *   - Client provides a "verification program" (the acceptance criteria)
 *   - Provider submits a deliverable
 *   - Evaluator runs the program on the deliverable inside a zkVM
 *   - zkVM produces a proof: "program P(deliverable D) = PASS/FAIL"
 *   - Proof is verified on-chain → complete() or reject()
 */

// --- Verification Program ---

export type VerificationProgram = {
  /** Human-readable name. */
  name: string;
  /**
   * Where to find the compiled program.
   * Supported formats:
   *   - IPFS CID: "QmXyz..." or "bafyXyz..."
   *   - HTTP URL: "https://..."
   *   - Local path: "/path/to/program.bin"
   */
  programRef: string;
  /** SHA-256 hash of the program binary (for integrity check). */
  programHash: string;
  /**
   * zkVM backend to use.
   *   - "sp1": Succinct SP1 (RISC-V, fastest)
   *   - "risc0": RISC Zero (RISC-V, Bonsai prover service)
   *   - "native": Run natively without ZK proof (dev/testing only)
   */
  backend: "sp1" | "risc0" | "native";
  /** Proof system for on-chain verification. */
  proofSystem?: "groth16" | "plonk";
};

// --- Execution ---

export type ZkvmExecuteParams = {
  /** The verification program to run. */
  program: VerificationProgram;
  /** The deliverable content to verify (passed as stdin to the program). */
  deliverable: string | Uint8Array;
  /** Optional additional inputs (e.g. job description, criteria). */
  auxiliaryInputs?: Record<string, string>;
};

export type ZkvmExecuteResult = {
  /** Program exit code (0 = pass). */
  exitCode: number;
  /** Whether the deliverable passed verification. */
  passed: boolean;
  /** Program stdout (evaluation details). */
  stdout: string;
  /** Serialized ZK proof (hex). */
  proof: string;
  /** Public outputs committed in the proof. */
  publicOutputs: string[];
  /** Hash of the verification program (public input). */
  programHash: string;
  /** Hash of the deliverable (public input). */
  deliverableHash: string;
  /** Time taken for proof generation (ms). */
  proverTimeMs: number;
};

// --- ERC-8183 Integration ---

export type ZkvmEvaluateJobParams = {
  /** ERC-8183 job ID. */
  jobId: string;
  /** Chain ID. */
  chainId: number;
  /** Reference to the deliverable (IPFS CID, URL, or inline content). */
  deliverableRef: string;
  /** The verification program. */
  program: VerificationProgram;
  /** Job description (passed as auxiliary input to the program). */
  jobDescription?: string;
};

export type ZkvmEvaluateJobResult = {
  /** Whether the deliverable passed. */
  passed: boolean;
  /** Program exit code. */
  exitCode: number;
  /** Program output (details). */
  stdout: string;
  /** complete or reject. */
  decision: "complete" | "reject";
  /** Transaction hash of the settlement. */
  txHash: string;
  /** Proof hash stored as ERC-8183 reason. */
  reasonHash: string;
  /** Proof generation time (ms). */
  proverTimeMs: number;
};
