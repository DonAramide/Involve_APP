import { RecoveryRegistry, RecoveryIncident } from './RecoveryRegistry';
import { ProviderFailoverService, ProviderType } from './ProviderFailoverService';

export interface RecoveryStats {
  activeIncidents: number;
  resolvedIncidents: number;
  providerHealth: Record<ProviderType, { isHealthy: boolean; consecutiveFailures: number }>;
  incidentBreakdown: Record<string, number>;
}

export class RecoveryDashboardService {
  /**
   * Exposes operational statistics.
   */
  static async getRecoveryStats(): Promise<RecoveryStats> {
    const incidents = RecoveryRegistry.getMockIncidents();
    const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED').length;
    const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED').length;

    const providerHealth: Record<ProviderType, { isHealthy: boolean; consecutiveFailures: number }> = {
      PAYSTACK: ProviderFailoverService.getHealthStatus('PAYSTACK'),
      FLUTTERWAVE: ProviderFailoverService.getHealthStatus('FLUTTERWAVE'),
      PROVIDUS: ProviderFailoverService.getHealthStatus('PROVIDUS'),
      WEMA: ProviderFailoverService.getHealthStatus('WEMA'),
    };

    const incidentBreakdown: Record<string, number> = {};
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
