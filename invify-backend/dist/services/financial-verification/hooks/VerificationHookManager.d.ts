import { BeforeVerificationHook } from "./BeforeVerificationHook";
import { BeforeModuleHook } from "./BeforeModuleHook";
import { AfterModuleHook } from "./AfterModuleHook";
import { AfterVerificationHook } from "./AfterVerificationHook";
import { VerificationContext } from "../shared/VerificationContext";
import { VerificationResult, VerificationVerdict, VerificationTrace } from "../shared/interfaces";
export declare class VerificationHookManager {
    private static instance;
    private beforeVerificationHooks;
    private beforeModuleHooks;
    private afterModuleHooks;
    private afterVerificationHooks;
    private onModuleFailureHooks;
    private constructor();
    static getInstance(): VerificationHookManager;
    registerBeforeVerification(hook: BeforeVerificationHook): void;
    registerBeforeModule(hook: BeforeModuleHook): void;
    registerAfterModule(hook: AfterModuleHook): void;
    registerAfterVerification(hook: AfterVerificationHook): void;
    registerOnModuleFailure(hook: (moduleId: string, error: string, context: VerificationContext) => Promise<void> | void): void;
    executeBeforeVerification(context: VerificationContext): Promise<void>;
    executeBeforeModule(moduleId: string, context: VerificationContext): Promise<void>;
    executeAfterModule(moduleId: string, result: VerificationResult, context: VerificationContext): Promise<void>;
    executeAfterVerification(verdict: VerificationVerdict, trace: VerificationTrace, context: VerificationContext): Promise<void>;
    executeOnModuleFailure(moduleId: string, error: string, context: VerificationContext): Promise<void>;
    clear(): void;
}
