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
import { GovernanceContext } from './shared/GovernanceContext';
import { GovernanceDecision } from './shared/GovernanceDecision';
import { GovernancePolicy, PolicyType } from './shared/GovernancePolicy';
export declare class FinancialGovernanceFramework {
    /**
     * Primary entry point.
     * Evaluates governance policies for a given operation context.
     * Must be called BEFORE FinancialVerificationFramework.
     */
    static evaluate(context: GovernanceContext): Promise<GovernanceDecision>;
    /**
     * Resolve active policies for a set of policy types.
     */
    static resolveActivePolicies(types: PolicyType[]): GovernancePolicy[];
    /**
     * Resolve what policy type governs a given capability string.
     */
    static resolveCapability(capability: string): PolicyType | null;
    /**
     * Sweep expired policies and return the count of newly expired policies.
     */
    static sweepExpiredPolicies(): number;
    /**
     * Reset all governance state (for tests).
     */
    static clearAll(): void;
}
