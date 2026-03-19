/**
 * zkVM — public API.
 */

export type {
  VerificationProgram,
  ZkvmExecuteParams,
  ZkvmExecuteResult,
  ZkvmEvaluateJobParams,
  ZkvmEvaluateJobResult,
} from "./types.js";

export { isSp1Available, isRisc0Available, execute } from "./executor.js";
