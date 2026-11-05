import { FinancialVerificationModule } from "../shared/interfaces";
export declare class VerificationModuleRegistry {
    private static instance;
    private modules;
    private constructor();
    static getInstance(): VerificationModuleRegistry;
    registerModule(module: FinancialVerificationModule): void;
    getModule(moduleId: string): FinancialVerificationModule | undefined;
    getModules(): FinancialVerificationModule[];
    clear(): void;
}
