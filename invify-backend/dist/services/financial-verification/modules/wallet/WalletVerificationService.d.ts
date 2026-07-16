import { FinancialVerificationModule, VerificationResult } from "../../shared/interfaces";
import { VerificationContext } from "../../shared/VerificationContext";
export declare class WalletVerificationService implements FinancialVerificationModule {
    readonly moduleId = "wallet_verification";
    readonly domain = "Wallet";
    readonly priority = 90;
    readonly mandatory = true;
    readonly version = "1.0.0";
    readonly capabilities: string[];
    verify(context: VerificationContext): Promise<VerificationResult>;
}
