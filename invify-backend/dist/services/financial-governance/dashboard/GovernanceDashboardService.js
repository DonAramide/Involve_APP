"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceDashboardService = void 0;
const PolicyRegistry_1 = require("../registry/PolicyRegistry");
const ChangeRequestService_1 = require("../approvals/ChangeRequestService");
const KillSwitchService_1 = require("../emergency/KillSwitchService");
const EmergencyPolicyService_1 = require("../emergency/EmergencyPolicyService");
const GovernanceAuditService_1 = require("../audit/GovernanceAuditService");
const ImmutableAuditChain_1 = require("../audit/ImmutableAuditChain");
const VersionManager_1 = require("../change-management/VersionManager");
const GovernanceCapabilityRegistry_1 = require("../registry/GovernanceCapabilityRegistry");
const ALL_POLICY_TYPES = [
    'TREASURY', 'LIQUIDITY', 'SETTLEMENT', 'ROUTING', 'VERIFICATION',
    'RISK', 'AML', 'WALLET', 'PROVIDER', 'CERTIFICATE', 'SECRET_ROTATION', 'FEATURE_FLAG',
];
class GovernanceDashboardService {
    static getSnapshot() {
        const now = new Date().toISOString();
        const activePolicies = PolicyRegistry_1.PolicyRegistry.getAll().filter((p) => p.status === 'ACTIVE');
        const pendingApprovals = ChangeRequestService_1.ChangeRequestService.getPending();
        const activeKillSwitches = KillSwitchService_1.KillSwitchService.getActiveKillSwitches();
        const activeEmergencyOverrides = EmergencyPolicyService_1.EmergencyPolicyService.getActiveOverrides();
        const severityCounts = GovernanceAuditService_1.GovernanceAuditService.getSeverityCounts();
        const allEvents = GovernanceAuditService_1.GovernanceAuditService.getEvents();
        const chainResult = ImmutableAuditChain_1.ImmutableAuditChain.verify();
        const policyVersionSummary = ALL_POLICY_TYPES.map((type) => {
            const history = VersionManager_1.VersionManager.getHistory(type);
            return { type, totalVersions: history.totalVersions, currentVersion: history.currentVersion };
        });
        // Policy drift detection
        const policyDrift = [];
        for (const type of ALL_POLICY_TYPES) {
            const active = PolicyRegistry_1.PolicyRegistry.getActive(type);
            if (!active) {
                policyDrift.push({
                    policyType: type,
                    issue: 'MISSING_ACTIVE_POLICY',
                    detail: `No ACTIVE policy found for ${type}. Platform is using hardcoded defaults.`,
                });
            }
            else if (active.expiryDate) {
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
            totalCapabilities: GovernanceCapabilityRegistry_1.GovernanceCapabilityRegistry.getAllCapabilities().length,
            policyDrift,
            governanceHealthScore,
            governanceHealthStatus,
        };
    }
}
exports.GovernanceDashboardService = GovernanceDashboardService;
//# sourceMappingURL=GovernanceDashboardService.js.map