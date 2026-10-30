import { GovernancePolicy, PolicyType } from '../shared/GovernancePolicy';
import { ChangeRequestService } from '../approvals/ChangeRequestService';
import { KillSwitch } from '../emergency/KillSwitchService';
import { EmergencyPolicyService } from '../emergency/EmergencyPolicyService';
export interface PolicyDriftItem {
    policyType: PolicyType;
    issue: 'MISSING_ACTIVE_POLICY' | 'POLICY_EXPIRING_SOON' | 'NO_VERSION_HISTORY';
    detail: string;
}
export interface GovernanceDashboardSnapshot {
    capturedAt: string;
    /** All currently ACTIVE policies */
    activePolicies: GovernancePolicy[];
    /** Change requests awaiting approval */
    pendingApprovals: ReturnType<typeof ChangeRequestService.getPending>;
    /** Active kill switches */
    activeKillSwitches: KillSwitch[];
    /** Emergency overrides active */
    activeEmergencyOverrides: ReturnType<typeof EmergencyPolicyService.getActiveOverrides>;
    /** Governance audit statistics */
    auditStats: {
        totalEvents: number;
        criticalEvents: number;
        warnEvents: number;
        infoEvents: number;
    };
    /** Chain integrity */
    auditChainIntegrity: boolean;
    /** Version history summary */
    policyVersionSummary: Array<{
        type: PolicyType;
        totalVersions: number;
        currentVersion: number | null;
    }>;
    /** Total capabilities registered */
    totalCapabilities: number;
    /** Drift detection */
    policyDrift: PolicyDriftItem[];
    /** Governance health score 0–100 */
    governanceHealthScore: number;
    governanceHealthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}
export declare class GovernanceDashboardService {
    static getSnapshot(): GovernanceDashboardSnapshot;
}
