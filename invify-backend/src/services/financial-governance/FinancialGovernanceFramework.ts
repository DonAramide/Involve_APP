/**
 * FinancialGovernanceFramework — The highest policy authority inside Invify.
 *
 * Responsibilities:
 *   ✅ Resolve active governance policies for an operation context
 *   ✅ Evaluate kill switch state for operation types
 *   ✅ Evaluate policy effective dates and expiry
 *   ✅ Generate governance decisions (ALLOWED / BLOCKED / REVIEW_REQUIRED)
 *   ✅ Produce full GovernanceTrace for every evaluation
 *   ✅ Record governance decisions in the audit chain
 *
 * It does NOT:
 *   ❌ Perform treasury mutations
 *   ❌ Update wallets or ledgers
 *   ❌ Execute settlements or provider calls
 *   ❌ Authorize financial transactions (Quasar's responsibility)
 *
 * Execution order enforced:
 *   Governance → Invify Verification → Quasar Authorization → Provider Execution
 */
import { GovernanceContext }         from './shared/GovernanceContext';
import { GovernanceDecision, DecisionOutcome } from './shared/GovernanceDecision';
import { GovernancePolicy, PolicyType }        from './shared/GovernancePolicy';
import { GovernanceTraceBuilder }    from './shared/GovernanceTrace';

import { PolicyRegistry }            from './registry/PolicyRegistry';
import { GovernanceCapabilityRegistry } from './registry/GovernanceCapabilityRegistry';

import { KillSwitchService }         from './emergency/KillSwitchService';
import { EmergencyPolicyService }    from './emergency/EmergencyPolicyService';
import { GovernanceAuditService }    from './audit/GovernanceAuditService';
import { ImmutableAuditChain }       from './audit/ImmutableAuditChain';

/** Policy types required for each operation type */
const OPERATION_POLICY_MAP: Record<string, PolicyType[]> = {
  TRANSFER:          ['TREASURY', 'ROUTING', 'VERIFICATION', 'RISK', 'AML', 'PROVIDER'],
  WITHDRAWAL:        ['TREASURY', 'WALLET', 'VERIFICATION', 'RISK', 'AML'],
  SETTLEMENT:        ['SETTLEMENT', 'ROUTING', 'PROVIDER'],
  VIRTUAL_ACCOUNT:   ['WALLET', 'VERIFICATION', 'FEATURE_FLAG'],
  WEBHOOK_CREDIT:    ['ROUTING', 'VERIFICATION'],
  REFUND:            ['TREASURY', 'WALLET', 'VERIFICATION'],
  REVERSAL:          ['TREASURY', 'WALLET', 'VERIFICATION'],
  TREASURY_MOVEMENT: ['TREASURY', 'LIQUIDITY', 'SETTLEMENT'],
  POLICY_CHANGE:     ['VERIFICATION'],
  CONFIGURATION_CHANGE: ['VERIFICATION'],
};

export class FinancialGovernanceFramework {
  /**
   * Primary entry point.
   * Evaluates governance policies for a given operation context.
   * Must be called BEFORE FinancialVerificationFramework.
   */
  static async evaluate(context: GovernanceContext): Promise<GovernanceDecision> {
    const tracer = new GovernanceTraceBuilder(context.correlationId);
    const violations: string[] = [];
    const warnings: string[] = [];
    const killSwitchHits: string[] = [];
    const activePolicies: GovernancePolicy[] = [];
    const now = new Date().toISOString();

    // ── Step 1: Kill Switch Check ──────────────────────────────────────────
    const killCheck = KillSwitchService.isOperationKilled(context.operationType, {
      provider: context.provider,
      tenantId: context.tenantId,
      currency: context.currency,
    });
    if (killCheck.killed) {
      killSwitchHits.push(...killCheck.activeTargets);
      violations.push(`Operation ${context.operationType} is blocked by kill switch(es): ${killCheck.activeTargets.join(', ')}`);
      tracer.step('KILL_SWITCH', null, null, 'FAIL',
        `Kill switch active for targets: ${killCheck.activeTargets.join(', ')}`);
    } else {
      tracer.step('KILL_SWITCH', null, null, 'PASS', 'No active kill switches for this operation.');
    }

    // ── Step 2: Emergency Override Check ──────────────────────────────────
    const activeEmergencyOverrides = EmergencyPolicyService.getActiveOverrides();
    if (activeEmergencyOverrides.length > 0) {
      warnings.push(`${activeEmergencyOverrides.length} active emergency override(s): ${activeEmergencyOverrides.map(o => o.overrideType).join(', ')}`);
      tracer.step('EMERGENCY_OVERRIDE', null, null, 'WARN',
        `Active emergency overrides: ${activeEmergencyOverrides.map(o => o.overrideType).join(', ')}`);
    } else {
      tracer.step('EMERGENCY_OVERRIDE', null, null, 'PASS', 'No active emergency overrides.');
    }

    // ── Step 3: Resolve Required Policy Types ─────────────────────────────
    const requiredPolicyTypes = OPERATION_POLICY_MAP[context.operationType] ?? [];
    tracer.step('POLICY_RESOLUTION', null, null, 'PASS',
      `Resolving ${requiredPolicyTypes.length} policy type(s) for ${context.operationType}.`);

    // ── Step 4: Evaluate Each Policy ──────────────────────────────────────
    for (const type of requiredPolicyTypes) {
      const policy = PolicyRegistry.getActive(type);

      if (!policy) {
        warnings.push(`No ACTIVE policy for ${type} — platform defaults apply.`);
        tracer.step(type, null, null, 'WARN', `No active ${type} policy found.`);
        continue;
      }

      // Effective date check
      if (policy.effectiveDate > now) {
        warnings.push(`${type} policy ${policy.id} is not yet effective (effectiveDate: ${policy.effectiveDate}).`);
        tracer.step(type, policy.id, policy.version, 'WARN',
          `Policy not yet effective. effectiveDate=${policy.effectiveDate}`);
        continue;
      }

      // Expiry check
      if (policy.expiryDate && policy.expiryDate <= now) {
        violations.push(`${type} policy ${policy.id} has expired (expiryDate: ${policy.expiryDate}).`);
        tracer.step(type, policy.id, policy.version, 'FAIL',
          `Policy expired at ${policy.expiryDate}.`);
        continue;
      }

      activePolicies.push(policy);
      tracer.step(type, policy.id, policy.version, 'PASS',
        `Active policy resolved: V${policy.version}, effectiveDate=${policy.effectiveDate}.`);
    }

    // ── Step 5: Amount limit check against TREASURY policy ────────────────
    if (context.amount !== undefined && context.amount > 0) {
      const treasury = activePolicies.find((p) => p.type === 'TREASURY');
      if (treasury) {
        const limit = treasury.data.maxTransactionAmount ?? Infinity;
        if (context.amount > limit) {
          violations.push(
            `Amount ${context.amount} exceeds treasury policy maxTransactionAmount of ${limit}.`
          );
          tracer.step('TREASURY_LIMIT', treasury.id, treasury.version, 'FAIL',
            `Amount ${context.amount} > limit ${limit}.`);
        } else {
          tracer.step('TREASURY_LIMIT', treasury.id, treasury.version, 'PASS',
            `Amount ${context.amount} ≤ limit ${limit}.`);
        }
      }
    }

    // ── Step 6: Determine Outcome ──────────────────────────────────────────
    const trace = tracer.build();
    let outcome: DecisionOutcome;
    let allowed: boolean;

    if (violations.length > 0) {
      outcome = killSwitchHits.length > 0 ? 'BLOCKED' : 'BLOCKED';
      allowed = false;
    } else if (warnings.length > 0) {
      // Check if manual review is required by RISK policy
      const riskPolicy = activePolicies.find((p) => p.type === 'RISK');
      const manualReviewEnabled = riskPolicy?.data?.manualReviewEnabled ?? true;
      outcome = manualReviewEnabled ? 'REVIEW_REQUIRED' : 'ALLOWED';
      allowed = true;
    } else {
      outcome = 'ALLOWED';
      allowed = true;
    }

    const decision: GovernanceDecision = {
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
    ImmutableAuditChain.append({
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

    GovernanceAuditService.record({
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
  static resolveActivePolicies(types: PolicyType[]): GovernancePolicy[] {
    return types.map((t) => PolicyRegistry.getActive(t)).filter((p): p is GovernancePolicy => p !== null);
  }

  /**
   * Resolve what policy type governs a given capability string.
   */
  static resolveCapability(capability: string): PolicyType | null {
    return GovernanceCapabilityRegistry.resolve(capability);
  }

  /**
   * Sweep expired policies and return the count of newly expired policies.
   */
  static sweepExpiredPolicies(): number {
    return PolicyRegistry.sweepExpired();
  }

  /**
   * Reset all governance state (for tests).
   */
  static clearAll(): void {
    PolicyRegistry.clearMockData();
    GovernanceAuditService.clearEvents();
    ImmutableAuditChain.clearChain();
    KillSwitchService.clearState();
    EmergencyPolicyService.clearState();
    GovernanceCapabilityRegistry.clearMockData();
  }
}
