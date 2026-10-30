import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
export declare class ProviderResponseVerificationService implements FinancialVerificationModule {
    readonly moduleId = "provider_response_verification";
    readonly domain = "Banking";
    readonly priority = 20;
    readonly mandatory = true;
    readonly version = "1.0.0";
    readonly capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
