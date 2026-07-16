"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentIntegrityGuardian = void 0;
class AgentIntegrityGuardian {
    MAX_ONBOARDING_BURST = 50; // max tenants per hour
    COOLDOWN_HOURS = 2;
    /**
     * Evaluates if a new onboarding attempt violates rate limits or velocity rules.
     */
    evaluateVelocityAnomaly(agentCode, recentOnboardingCount) {
        if (recentOnboardingCount > this.MAX_ONBOARDING_BURST) {
            console.warn(`Velocity anomaly detected for agent ${agentCode}. Exceeded ${this.MAX_ONBOARDING_BURST} onboardings.`);
            return true;
        }
        return false;
    }
    /**
     * Cross-references geo lineage to detect impossible travel or geographic spoofing.
     */
    detectGeographicInconsistency(agentCode, lastRegion, currentRegion) {
        // Simple mock logic for geo spoofing (e.g. suddenly onboarding in a different continent within minutes)
        if (lastRegion && lastRegion !== currentRegion) {
            // A more sophisticated system would check timestamps vs physical distance
            console.warn(`Geographic inconsistency detected for agent ${agentCode}: ${lastRegion} -> ${currentRegion}`);
            return true; // Flag for review
        }
        return false;
    }
    /**
     * Checks if an identity is attempting to duplicate an existing business onboarding.
     */
    suppressDuplicateIdentity(businessTaxId, businessName) {
        // TODO: Query DB for existing tax ID or normalized business name
        const isDuplicate = false; // Mock
        if (isDuplicate) {
            console.warn(`Duplicate onboarding suppressed for Business: ${businessName} (ID: ${businessTaxId})`);
            return true;
        }
        return false;
    }
    /**
     * Freezes an agent's payouts pending a manual fraud review.
     */
    freezePayouts(agentCode, reason) {
        // TODO: Update AgentEntity state and log security audit event
        console.error(`PAYOUTS FROZEN for agent ${agentCode}. Reason: ${reason}`);
    }
}
exports.AgentIntegrityGuardian = AgentIntegrityGuardian;
//# sourceMappingURL=AgentIntegrityGuardian.js.map