import { PolicyType } from '../shared/GovernancePolicy';
/** Fine-grained capability string, e.g. "treasury.float", "routing.priority" */
export type GovernanceCapability = string;
export declare class GovernanceCapabilityRegistry {
    /** capability → policyType */
    private static capToPolicy;
    /** policyType → capability[] */
    private static policyToCaps;
    private static rebuild;
    static clearMockData(): void;
    static register(capability: GovernanceCapability, policyType: PolicyType): void;
    /** Resolve which PolicyType governs a given capability string. */
    static resolve(capability: GovernanceCapability): PolicyType | null;
    /** All capabilities owned by a policy type. */
    static getCapabilitiesFor(policyType: PolicyType): GovernanceCapability[];
    static getAllCapabilities(): GovernanceCapability[];
    static getAllMappings(): Array<{
        capability: GovernanceCapability;
        policyType: PolicyType;
    }>;
}
