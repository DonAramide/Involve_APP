import { VerificationContext } from "../shared/VerificationContext";
export type BeforeVerificationHook = (context: VerificationContext) => Promise<void> | void;
