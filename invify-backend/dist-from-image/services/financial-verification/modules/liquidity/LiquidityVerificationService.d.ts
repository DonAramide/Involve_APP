import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
export declare class LiquidityVerificationService implements FinancialVerificationModule {
    readonly moduleId = "liquidity_verification";
    readonly domain = "Treasury";
    readonly priority = 80;
    readonly mandatory = true;
    readonly version = "1.0.0";
    readonly capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
