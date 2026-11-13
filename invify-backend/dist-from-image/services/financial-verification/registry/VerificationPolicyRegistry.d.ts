import { VerificationDomainType, VerificationPolicyType } from "../shared/interfaces";
export interface PolicyConfig {
    policyName: VerificationPolicyType | string;
    domain: VerificationDomainType;
    requiredCapabilities: string[];
    failFast: boolean;
    optionalCapabilities?: string[];
}
export declare class VerificationPolicyRegistry {
    private static instance;
    private policies;
    private constructor();
    static getInstance(): VerificationPolicyRegistry;
    registerPolicy(config: PolicyConfig): void;
    getPolicy(domain: VerificationDomainType, policyName: string): PolicyConfig | undefined;
    clear(): void;
}
