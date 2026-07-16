import { VerificationDomainType, FinancialVerificationModule } from "../shared/interfaces";
export declare class VerificationDomainRegistry {
    private static instance;
    private domains;
    private constructor();
    static getInstance(): VerificationDomainRegistry;
    registerDomain(domain: VerificationDomainType | string): void;
    setDomainStatus(domain: VerificationDomainType | string, enabled: boolean): void;
    isDomainEnabled(domain: VerificationDomainType | string): boolean;
    getModulesForPolicy(domain: VerificationDomainType | string, policyName: string): FinancialVerificationModule[];
    clear(): void;
}
