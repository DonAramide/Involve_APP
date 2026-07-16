import { VerificationContext } from "../shared/VerificationContext";
import { VerificationResult } from "../shared/interfaces";
export type AfterModuleHook = (moduleId: string, result: VerificationResult, context: VerificationContext) => Promise<void> | void;
