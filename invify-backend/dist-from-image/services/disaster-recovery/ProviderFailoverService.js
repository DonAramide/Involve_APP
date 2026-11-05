"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderFailoverService = void 0;
const RecoveryRegistry_1 = require("./RecoveryRegistry");
class ProviderFailoverService {
    static providerHealth = {
        PAYSTACK: { isHealthy: true, consecutiveFailures: 0 },
        FLUTTERWAVE: { isHealthy: true, consecutiveFailures: 0 },
        PROVIDUS: { isHealthy: true, consecutiveFailures: 0 },
        WEMA: { isHealthy: true, consecutiveFailures: 0 },
    };
    static fallbacks = {
        WEMA: 'PROVIDUS',
        PROVIDUS: 'WEMA',
        PAYSTACK: 'FLUTTERWAVE',
        FLUTTERWAVE: 'PAYSTACK',
    };
    static threshold = 3;
    static clearStates() {
        this.providerHealth = {
            PAYSTACK: { isHealthy: true, consecutiveFailures: 0 },
            FLUTTERWAVE: { isHealthy: true, consecutiveFailures: 0 },
            PROVIDUS: { isHealthy: true, consecutiveFailures: 0 },
            WEMA: { isHealthy: true, consecutiveFailures: 0 },
        };
    }
    static getHealthStatus(provider) {
        return this.providerHealth[provider];
    }
    /**
     * Returns active/fallback healthy provider.
     */
    static getActiveProvider(primary) {
        const health = this.providerHealth[primary];
        if (health.isHealthy) {
            return primary;
        }
        const fallback = this.fallbacks[primary];
        console.log(`[Failover] Routing: Primary ${primary} is UNHEALTHY. Routing to Fallback ${fallback}`);
        return fallback;
    }
    /**
     * Record a success. Resets failure count.
     */
    static recordSuccess(provider) {
        this.providerHealth[provider].consecutiveFailures = 0;
        this.providerHealth[provider].isHealthy = true;
    }
    /**
     * Record a failure. Triggers provider failover if threshold exceeded.
     */
    static async recordFailure(provider, reason = 'API failure') {
        const state = this.providerHealth[provider];
        state.consecutiveFailures++;
        if (state.consecutiveFailures >= this.threshold && state.isHealthy) {
            state.isHealthy = false;
            const fallback = this.fallbacks[provider];
            const details = `Provider ${provider} declared UNHEALTHY after ${state.consecutiveFailures} consecutive errors. Failover initiated to ${fallback}. Reason: ${reason}`;
            console.warn(`[FailoverTriggered] ${details}`);
            // Log recovery incident
            await RecoveryRegistry_1.RecoveryRegistry.insertIncident({
                component: 'PROVIDER',
                description: details,
                resolution_action: 'FAILOVER',
                status: 'RESOLVED',
            });
        }
    }
}
exports.ProviderFailoverService = ProviderFailoverService;
//# sourceMappingURL=ProviderFailoverService.js.map