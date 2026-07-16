"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderHealthMonitor = void 0;
const ProviderFailoverService_1 = require("../disaster-recovery/ProviderFailoverService");
const ALL_PROVIDERS = ['PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA'];
class ProviderHealthMonitor {
    /**
     * Returns a real-time snapshot of all provider health states.
     */
    static getSnapshot() {
        const providers = ALL_PROVIDERS.map((p) => {
            const health = ProviderFailoverService_1.ProviderFailoverService.getHealthStatus(p);
            return {
                provider: p,
                isHealthy: health.isHealthy,
                consecutiveFailures: health.consecutiveFailures,
                circuitState: health.isHealthy ? 'CLOSED' : 'OPEN',
            };
        });
        const healthyProviders = providers.filter((p) => p.isHealthy).length;
        const unhealthyProviders = providers.filter((p) => !p.isHealthy).length;
        const totalFailovers = providers.reduce((acc, p) => acc + (p.circuitState === 'OPEN' ? 1 : 0), 0);
        return {
            healthyProviders,
            unhealthyProviders,
            totalFailovers,
            providers,
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.ProviderHealthMonitor = ProviderHealthMonitor;
//# sourceMappingURL=ProviderHealthMonitor.js.map