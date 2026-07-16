import { VerificationContext } from "../shared/VerificationContext";
import { VerificationVerdict, VerificationTrace } from "../shared/interfaces";
export type AfterVerificationHook = (verdict: VerificationVerdict, trace: VerificationTrace, context: VerificationContext) => Promise<void> | void;
