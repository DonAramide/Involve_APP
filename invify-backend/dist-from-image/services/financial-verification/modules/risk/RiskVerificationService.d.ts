import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
export declare class RiskVerificationService implements FinancialVerificationModule {
    readonly moduleId = "risk_verification";
    readonly domain = "Risk";
    readonly priority = 40;
    readonly mandatory = true;
    readonly version = "1.0.0";
    readonly capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
