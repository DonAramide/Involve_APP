import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
export declare class SettlementVerificationService implements FinancialVerificationModule {
    readonly moduleId = "settlement_verification";
    readonly domain = "Settlement";
    readonly priority = 70;
    readonly mandatory = true;
    readonly version = "1.0.0";
    readonly capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
