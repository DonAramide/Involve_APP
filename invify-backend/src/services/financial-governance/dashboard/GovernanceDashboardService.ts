import { GovernancePolicy, PolicyType } from '../shared/GovernancePolicy';
import { PolicyRegistry }              from '../registry/PolicyRegistry';
import { ChangeRequestService }        from '../approvals/ChangeRequestService';
import { KillSwitchService, KillSwitch } from '../emergency/KillSwitchService';
import { EmergencyPolicyService }      from '../emergency/EmergencyPolicyService';
import { GovernanceAuditService }      from '../audit/GovernanceAuditService';
import { ImmutableAuditChain }         from '../audit/ImmutableAuditChain';
import { VersionManager }              from '../change-management/VersionManager';
import { GovernanceCapabilityRegistry } from '../registry/GovernanceCapabilityRegistry';

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
  policyVersionSummary: Array<{ type: PolicyType; totalVersions: number; currentVersion: number | null }>;
  /** Total capabilities registered */
  totalCapabilities: number;
  /** Drift detection */
  policyDrift: PolicyDriftItem[];
  /** Governance health score 0–100 */
  governanceHealthScore: number;
  governanceHealthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}

const ALL_POLICY_TYPES: PolicyType[] = [
  'TREASURY','LIQUIDITY','SETTLEMENT','ROUTING','VERIFICATION',
  'RISK','AML','WALLET','PROVIDER','CERTIFICATE','SECRET_ROTATION','FEATURE_FLAG',
];

export class GovernanceDashboardService {
  static getSnapshot(): GovernanceDashboardSnapshot {
    const now = new Date().toISOString();

    const activePolicies = PolicyRegistry.getAll().filter((p) => p.status === 'ACTIVE');
    const pendingApprovals = ChangeRequestService.getPending();
    const activeKillSwitches = KillSwitchService.getActiveKillSwitches();
    const activeEmergencyOverrides = EmergencyPolicyService.getActiveOverrides();

    const severityCounts = GovernanceAuditService.getSeverityCounts();
    const allEvents = GovernanceAuditService.getEvents();
    const chainResult = ImmutableAuditChain.verify();

    const policyVersionSummary = ALL_POLICY_TYPES.map((type) => {
      const history = VersionManager.getHistory(type);
      return { type, totalVersions: history.totalVersions, currentVersion: history.currentVersion };
    });

    // Policy drift detection
    const policyDrift: PolicyDriftItem[] = [];
    for (const type of ALL_POLICY_TYPES) {
      const active = PolicyRegistry.getActive(type);
      if (!active) {
        policyDrift.push({
          policyType: type,
          issue: 'MISSING_ACTIVE_POLICY',
          detail: `No ACTIVE policy found for ${type}. Platform is using hardcoded defaults.`,
        });
      } else if (active.expiryDate) {
        const expiryMs = new Date(active.expiryDate).getTime() - Date.now();
        const daysLeft = expiryMs / (1000 * 60 * 60 * 24);
        if (daysLeft < 14) {
          policyDrift.push({
            policyType: type,
            issue: 'POLICY_EXPIRING_SOON',
            detail: `${type} policy (${active.id}) expires in ${daysLeft.toFixed(1)} days.`,
          });
        }
      }
    }

    // Health score
    const maxScore = 100;
    let deductions = 0;
    deductions += policyDrift.filter((d) => d.issue === 'MISSING_ACTIVE_POLICY').length * 5;
    deductions += policyDrift.filter((d) => d.issue === 'POLICY_EXPIRING_SOON').length * 3;
    deductions += activeKillSwitches.length * 10;
    deductions += activeEmergencyOverrides.length * 15;
    deductions += severityCounts.CRITICAL * 2;
    deductions += !chainResult.valid ? 20 : 0;

    const governanceHealthScore = Math.max(0, Math.min(100, maxScore - deductions));
    const governanceHealthStatus = governanceHealthScore >= 80
      ? 'HEALTHY' : governanceHealthScore >= 50 ? 'DEGRADED' : 'CRITICAL';

    return {
      capturedAt: now,
      activePolicies,
      pendingApprovals,
      activeKillSwitches,
      activeEmergencyOverrides,
      auditStats: {
        totalEvents: allEvents.length,
        criticalEvents: severityCounts.CRITICAL,
        warnEvents: severityCounts.WARN,
        infoEvents: severityCounts.INFO,
      },
      auditChainIntegrity: chainResult.valid,
      policyVersionSummary,
      totalCapabilities: GovernanceCapabilityRegistry.getAllCapabilities().length,
      policyDrift,
      governanceHealthScore,
      governanceHealthStatus,
    };
  }
}
