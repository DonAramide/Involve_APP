import { ProviderFailoverService, ProviderType } from '../disaster-recovery/ProviderFailoverService';

export interface ProviderHealthSummary {
  provider: ProviderType;
  isHealthy: boolean;
  consecutiveFailures: number;
  circuitState: 'CLOSED' | 'OPEN';
}

export interface ProviderHealthSnapshot {
  healthyProviders: number;
  unhealthyProviders: number;
  totalFailovers: number;
  providers: ProviderHealthSummary[];
  capturedAt: string;
}

const ALL_PROVIDERS: ProviderType[] = ['PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA'];

export class ProviderHealthMonitor {
  /**
   * Returns a real-time snapshot of all provider health states.
   */
  static getSnapshot(): ProviderHealthSnapshot {
    const providers: ProviderHealthSummary[] = ALL_PROVIDERS.map((p) => {
      const health = ProviderFailoverService.getHealthStatus(p);
      return {
        provider: p,
        isHealthy: health.isHealthy,
        consecutiveFailures: health.consecutiveFailures,
        circuitState: health.isHealthy ? 'CLOSED' : 'OPEN',
      };
    });

    const healthyProviders = providers.filter((p) => p.isHealthy).length;
    const unhealthyProviders = providers.filter((p) => !p.isHealthy).length;
    const totalFailovers = providers.reduce(
      (acc, p) => acc + (p.circuitState === 'OPEN' ? 1 : 0),
      0
    );

    return {
      healthyProviders,
      unhealthyProviders,
      totalFailovers,
      providers,
      capturedAt: new Date().toISOString(),
    };
  }
}
