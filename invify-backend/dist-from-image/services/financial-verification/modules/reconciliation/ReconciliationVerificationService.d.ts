import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
export declare class ReconciliationVerificationService implements FinancialVerificationModule {
    readonly moduleId = "reconciliation_verification";
    readonly domain = "Reconciliation";
    readonly priority = 60;
    readonly mandatory = true;
    readonly version = "1.0.0";
    readonly capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
