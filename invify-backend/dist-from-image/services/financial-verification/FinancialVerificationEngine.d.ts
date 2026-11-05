import { VerificationContext } from "./shared/VerificationContext";
import { VerificationDomainType, VerificationPolicyType, VerificationVerdict, VerificationTrace } from "./shared/interfaces";
export declare class FinancialVerificationEngine {
    private registry;
    private hooks;
    constructor();
    addHook(event: keyof typeof this.hooks, fn: any): void;
    clearHooks(): void;
    execute(context: VerificationContext, domain: VerificationDomainType, policy: VerificationPolicyType): Promise<{
        verdict: VerificationVerdict;
        trace: VerificationTrace;
    }>;
}
