import { FinancialVerificationModule } from "../shared/interfaces";
export declare class VerificationCapabilityRegistry {
    private static instance;
    private constructor();
    static getInstance(): VerificationCapabilityRegistry;
    /**
     * Resolves all active modules providing the requested capability.
     */
    resolveModulesForCapability(capability: string): FinancialVerificationModule[];
    /**
     * Resolves the primary active module providing the requested capability.
     */
    resolveModuleForCapability(capability: string): FinancialVerificationModule | undefined;
}
