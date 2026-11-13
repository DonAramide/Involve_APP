import { PolicyType } from '../shared/GovernancePolicy';
export interface VersionChainEntry {
    policyId: string;
    version: number;
    status: string;
    activatedAt: string | null;
    supersededById: string | null;
}
export declare class PolicyVersionRegistry {
    /** type → ordered list of version chain entries (oldest first) */
    private static chains;
    /** type → highest version number ever registered */
    private static counters;
    static clearMockData(): void;
    static nextVersion(type: PolicyType): number;
    static peekVersion(type: PolicyType): number;
    static record(entry: VersionChainEntry, type: PolicyType): void;
    static getChain(type: PolicyType): VersionChainEntry[];
    static markSuperseded(type: PolicyType, policyId: string, supersededById: string): void;
    static markActivated(type: PolicyType, policyId: string, activatedAt: string): void;
    /** Returns the entry immediately preceding the given policyId (rollback target). */
    static getPreviousEntry(type: PolicyType, policyId: string): VersionChainEntry | null;
    static getAllTypes(): PolicyType[];
}
