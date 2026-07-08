// src/services/financial-verification/hooks/BeforeModuleHook.ts
import { VerificationContext } from "../shared/VerificationContext";
export type BeforeModuleHook = (moduleId: string, context: VerificationContext) => Promise<void> | void;
