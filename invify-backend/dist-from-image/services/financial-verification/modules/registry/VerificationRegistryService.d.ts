import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
export declare class VerificationRegistryService implements FinancialVerificationModule {
    readonly moduleId = "verification_registry";
    readonly domain = "Banking";
    readonly priority = 30;
    readonly mandatory = true;
    readonly version = "1.0.0";
    readonly capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
