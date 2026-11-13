import { PolicyType } from '../shared/GovernancePolicy';
export interface VersionHistory {
    policyType: PolicyType;
    versions: Array<{
        version: number;
        policyId: string;
        status: string;
        activatedAt: string | null;
        supersededById: string | null;
    }>;
    totalVersions: number;
    currentVersion: number | null;
}
export declare class VersionManager {
    static getHistory(type: PolicyType): VersionHistory;
    static getAllHistories(): VersionHistory[];
    static getLatestVersion(type: PolicyType): number;
}
