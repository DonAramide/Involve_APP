import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
export declare class FinancialEventVerificationService implements FinancialVerificationModule {
    readonly moduleId = "financial_event_verification";
    readonly domain = "Banking";
    readonly priority = 50;
    readonly mandatory = true;
    readonly version = "1.0.0";
    readonly capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
