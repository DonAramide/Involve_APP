"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecoveryDashboardService = void 0;
const RecoveryRegistry_1 = require("./RecoveryRegistry");
const ProviderFailoverService_1 = require("./ProviderFailoverService");
class RecoveryDashboardService {
    /**
     * Exposes operational statistics.
     */
    static async getRecoveryStats() {
        const incidents = RecoveryRegistry_1.RecoveryRegistry.getMockIncidents();
        const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED').length;
        const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED').length;
        const providerHealth = {
            PAYSTACK: ProviderFailoverService_1.ProviderFailoverService.getHealthStatus('PAYSTACK'),
            FLUTTERWAVE: ProviderFailoverService_1.ProviderFailoverService.getHealthStatus('FLUTTERWAVE'),
            PROVIDUS: ProviderFailoverService_1.ProviderFailoverService.getHealthStatus('PROVIDUS'),
            WEMA: ProviderFailoverService_1.ProviderFailoverService.getHealthStatus('WEMA'),
        };
        const incidentBreakdown = {};
        for (const inc of incidents) {
            incidentBreakdown[inc.component] = (incidentBreakdown[inc.component] || 0) + 1;
        }
        return {
            activeIncidents,
            resolvedIncidents,
            providerHealth,
            incidentBreakdown,
        };
    }
}
exports.RecoveryDashboardService = RecoveryDashboardService;
//# sourceMappingURL=RecoveryDashboardService.js.map