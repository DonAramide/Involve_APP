"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialGovernanceFramework = void 0;
const GovernanceTrace_1 = require("./shared/GovernanceTrace");
const PolicyRegistry_1 = require("./registry/PolicyRegistry");
const GovernanceCapabilityRegistry_1 = require("./registry/GovernanceCapabilityRegistry");
const KillSwitchService_1 = require("./emergency/KillSwitchService");
const EmergencyPolicyService_1 = require("./emergency/EmergencyPolicyService");
const GovernanceAuditService_1 = require("./audit/GovernanceAuditService");
const ImmutableAuditChain_1 = require("./audit/ImmutableAuditChain");
/** Policy types required for each operation type */
const OPERATION_POLICY_MAP = {
    TRANSFER: ['TREASURY', 'ROUTING', 'VERIFICATION', 'RISK', 'AML', 'PROVIDER'],
    WITHDRAWAL: ['TREASURY', 'WALLET', 'VERIFICATION', 'RISK', 'AML'],
    SETTLEMENT: ['SETTLEMENT', 'ROUTING', 'PROVIDER'],
    VIRTUAL_ACCOUNT: ['WALLET', 'VERIFICATION', 'FEATURE_FLAG'],
    WEBHOOK_CREDIT: ['ROUTING', 'VERIFICATION'],
    REFUND: ['TREASURY', 'WALLET', 'VERIFICATION'],
    REVERSAL: ['TREASURY', 'WALLET', 'VERIFICATION'],
    TREASURY_MOVEMENT: ['TREASURY', 'LIQUIDITY', 'SETTLEMENT'],
    POLICY_CHANGE: ['VERIFICATION'],
    CONFIGURATION_CHANGE: ['VERIFICATION'],
};
class FinancialGovernanceFramework {
    /**
     * Primary entry point.
     * Evaluates governance policies for a given operation context.
     * Must be called BEFORE FinancialVerificationFramework.
     */
    static async evaluate(context) {
        const tracer = new GovernanceTrace_1.GovernanceTraceBuilder(context.correlationId);
        const violations = [];
        const warnings = [];
        const killSwitchHits = [];
        const activePolicies = [];
        const now = new Date().toISOString();
        // ── Step 1: Kill Switch Check ──────────────────────────────────────────
        const killCheck = KillSwitchService_1.KillSwitchService.isOperationKilled(context.operationType, {
            provider: context.provider,
            tenantId: context.tenantId,
            currency: context.currency,
        });
        if (killCheck.killed) {
            killSwitchHits.push(...killCheck.activeTargets);
            violations.push(`Operation ${context.operationType} is blocked by kill switch(es): ${killCheck.activeTargets.join(', ')}`);
            tracer.step('KILL_SWITCH', null, null, 'FAIL', `Kill switch active for targets: ${killCheck.activeTargets.join(', ')}`);
        }
        else {
            tracer.step('KILL_SWITCH', null, null, 'PASS', 'No active kill switches for this operation.');
        }
        // ── Step 2: Emergency Override Check ──────────────────────────────────
        const activeEmergencyOverrides = EmergencyPolicyService_1.EmergencyPolicyService.getActiveOverrides();
        if (activeEmergencyOverrides.length > 0) {
            warnings.push(`${activeEmergencyOverrides.length} active emergency override(s): ${activeEmergencyOverrides.map(o => o.overrideType).join(', ')}`);
            tracer.step('EMERGENCY_OVERRIDE', null, null, 'WARN', `Active emergency overrides: ${activeEmergencyOverrides.map(o => o.overrideType).join(', ')}`);
        }
        else {
            tracer.step('EMERGENCY_OVERRIDE', null, null, 'PASS', 'No active emergency overrides.');
        }
        // ── Step 3: Resolve Required Policy Types ─────────────────────────────
        const requiredPolicyTypes = OPERATION_POLICY_MAP[context.operationType] ?? [];
        tracer.step('POLICY_RESOLUTION', null, null, 'PASS', `Resolving ${requiredPolicyTypes.length} policy type(s) for ${context.operationType}.`);
        // ── Step 4: Evaluate Each Policy ──────────────────────────────────────
        for (const type of requiredPolicyTypes) {
            const policy = PolicyRegistry_1.PolicyRegistry.getActive(type);
            if (!policy) {
                warnings.push(`No ACTIVE policy for ${type} — platform defaults apply.`);
                tracer.step(type, null, null, 'WARN', `No active ${type} policy found.`);
                continue;
            }
            // Effective date check
            if (policy.effectiveDate > now) {
                warnings.push(`${type} policy ${policy.id} is not yet effective (effectiveDate: ${policy.effectiveDate}).`);
                tracer.step(type, policy.id, policy.version, 'WARN', `Policy not yet effective. effectiveDate=${policy.effectiveDate}`);
                continue;
            }
            // Expiry check
            if (policy.expiryDate && policy.expiryDate <= now) {
                violations.push(`${type} policy ${policy.id} has expired (expiryDate: ${policy.expiryDate}).`);
                tracer.step(type, policy.id, policy.version, 'FAIL', `Policy expired at ${policy.expiryDate}.`);
                continue;
            }
            activePolicies.push(policy);
            tracer.step(type, policy.id, policy.version, 'PASS', `Active policy resolved: V${policy.version}, effectiveDate=${policy.effectiveDate}.`);
        }
        // ── Step 5: Amount limit check against TREASURY policy ────────────────
        if (context.amount !== undefined && context.amount > 0) {
            const treasury = activePolicies.find((p) => p.type === 'TREASURY');
            if (treasury) {
                const limit = treasury.data.maxTransactionAmount ?? Infinity;
                if (context.amount > limit) {
                    violations.push(`Amount ${context.amount} exceeds treasury policy maxTransactionAmount of ${limit}.`);
                    tracer.step('TREASURY_LIMIT', treasury.id, treasury.version, 'FAIL', `Amount ${context.amount} > limit ${limit}.`);
                }
                else {
                    tracer.step('TREASURY_LIMIT', treasury.id, treasury.version, 'PASS', `Amount ${context.amount} ≤ limit ${limit}.`);
                }
            }
        }
        // ── Step 6: Determine Outcome ──────────────────────────────────────────
        const trace = tracer.build();
        let outcome;
        let allowed;
        if (violations.length > 0) {
            outcome = killSwitchHits.length > 0 ? 'BLOCKED' : 'BLOCKED';
            allowed = false;
        }
        else if (warnings.length > 0) {
            // Check if manual review is required by RISK policy
            const riskPolicy = activePolicies.find((p) => p.type === 'RISK');
            const manualReviewEnabled = riskPolicy?.data?.manualReviewEnabled ?? true;
            outcome = manualReviewEnabled ? 'REVIEW_REQUIRED' : 'ALLOWED';
            allowed = true;
        }
        else {
            outcome = 'ALLOWED';
            allowed = true;
        }
        const decision = {
            allowed,
            outcome,
            activePolicies,
            violations,
            warnings,
            killSwitchHits,
            trace,
            decidedAt: new Date().toISOString(),
        };
        // ── Step 7: Record in Immutable Audit Chain ────────────────────────────
        ImmutableAuditChain_1.ImmutableAuditChain.append({
            correlationId: context.correlationId,
            operationType: context.operationType,
            tenantId: context.tenantId,
            outcome,
            allowed,
            policiesEvaluated: activePolicies.length,
            violations: violations.length,
            killSwitchHits: killSwitchHits.length,
            decidedAt: decision.decidedAt,
        });
        GovernanceAuditService_1.GovernanceAuditService.record({
            eventType: 'GOVERNANCE_DECISION',
            severity: allowed ? 'INFO' : 'WARN',
            actor: context.requestedBy ?? 'SYSTEM',
            targetId: context.correlationId,
            description: `Governance decision: ${outcome} for ${context.operationType} (tenant=${context.tenantId}).`,
            correlationId: context.correlationId,
            metadata: { violations: violations.length, warnings: warnings.length },
        });
        return decision;
    }
    /**
     * Resolve active policies for a set of policy types.
     */
    static resolveActivePolicies(types) {
        return types.map((t) => PolicyRegistry_1.PolicyRegistry.getActive(t)).filter((p) => p !== null);
    }
    /**
     * Resolve what policy type governs a given capability string.
     */
    static resolveCapability(capability) {
        return GovernanceCapabilityRegistry_1.GovernanceCapabilityRegistry.resolve(capability);
    }
    /**
     * Sweep expired policies and return the count of newly expired policies.
     */
    static sweepExpiredPolicies() {
        return PolicyRegistry_1.PolicyRegistry.sweepExpired();
    }
    /**
     * Reset all governance state (for tests).
     */
    static clearAll() {
        PolicyRegistry_1.PolicyRegistry.clearMockData();
        GovernanceAuditService_1.GovernanceAuditService.clearEvents();
        ImmutableAuditChain_1.ImmutableAuditChain.clearChain();
        KillSwitchService_1.KillSwitchService.clearState();
        EmergencyPolicyService_1.EmergencyPolicyService.clearState();
        GovernanceCapabilityRegistry_1.GovernanceCapabilityRegistry.clearMockData();
    }
}
exports.FinancialGovernanceFramework = FinancialGovernanceFramework;
//# sourceMappingURL=FinancialGovernanceFramework.js.map