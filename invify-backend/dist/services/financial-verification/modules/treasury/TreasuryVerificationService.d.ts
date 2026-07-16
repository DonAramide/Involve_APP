import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
export declare class TreasuryVerificationService implements FinancialVerificationModule {
    readonly moduleId = "treasury_verification";
    readonly domain = "Treasury";
    readonly priority = 100;
    readonly mandatory = true;
    readonly version = "1.0.0";
    readonly capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
