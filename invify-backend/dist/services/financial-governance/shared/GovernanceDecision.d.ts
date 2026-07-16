import { GovernancePolicy } from './GovernancePolicy';
import { GovernanceTrace } from './GovernanceTrace';
export type DecisionOutcome = 'ALLOWED' | 'BLOCKED' | 'REVIEW_REQUIRED' | 'EMERGENCY_OVERRIDE';
export interface GovernanceDecision {
    /** Whether the operation is allowed to proceed */
    allowed: boolean;
    outcome: DecisionOutcome;
    /** All active policies evaluated during this decision */
    activePolicies: GovernancePolicy[];
    /** Policy violations that caused BLOCKED / REVIEW_REQUIRED */
    violations: string[];
    /** Non-blocking warnings */
    warnings: string[];
    /** Kill switch targets that were active during this decision */
    killSwitchHits: string[];
    trace: GovernanceTrace;
    decidedAt: string;
}
