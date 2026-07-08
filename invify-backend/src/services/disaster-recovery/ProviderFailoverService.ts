import { RecoveryRegistry } from './RecoveryRegistry';

export type ProviderType = 'PAYSTACK' | 'FLUTTERWAVE' | 'PROVIDUS' | 'WEMA';

export class ProviderFailoverService {
  private static providerHealth: Record<ProviderType, { isHealthy: boolean; consecutiveFailures: number }> = {
    PAYSTACK: { isHealthy: true, consecutiveFailures: 0 },
    FLUTTERWAVE: { isHealthy: true, consecutiveFailures: 0 },
    PROVIDUS: { isHealthy: true, consecutiveFailures: 0 },
    WEMA: { isHealthy: true, consecutiveFailures: 0 },
  };

  private static fallbacks: Record<ProviderType, ProviderType> = {
    WEMA: 'PROVIDUS',
    PROVIDUS: 'WEMA',
    PAYSTACK: 'FLUTTERWAVE',
    FLUTTERWAVE: 'PAYSTACK',
  };

  private static threshold = 3;

  static clearStates() {
    this.providerHealth = {
      PAYSTACK: { isHealthy: true, consecutiveFailures: 0 },
      FLUTTERWAVE: { isHealthy: true, consecutiveFailures: 0 },
      PROVIDUS: { isHealthy: true, consecutiveFailures: 0 },
      WEMA: { isHealthy: true, consecutiveFailures: 0 },
    };
  }

  static getHealthStatus(provider: ProviderType): { isHealthy: boolean; consecutiveFailures: number } {
    return this.providerHealth[provider];
  }

  /**
   * Returns active/fallback healthy provider.
   */
  static getActiveProvider(primary: ProviderType): ProviderType {
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
  static recordSuccess(provider: ProviderType) {
    this.providerHealth[provider].consecutiveFailures = 0;
    this.providerHealth[provider].isHealthy = true;
  }

  /**
   * Record a failure. Triggers provider failover if threshold exceeded.
   */
  static async recordFailure(provider: ProviderType, reason = 'API failure'): Promise<void> {
    const state = this.providerHealth[provider];
    state.consecutiveFailures++;

    if (state.consecutiveFailures >= this.threshold && state.isHealthy) {
      state.isHealthy = false;
      const fallback = this.fallbacks[provider];
      const details = `Provider ${provider} declared UNHEALTHY after ${state.consecutiveFailures} consecutive errors. Failover initiated to ${fallback}. Reason: ${reason}`;
      console.warn(`[FailoverTriggered] ${details}`);

      // Log recovery incident
      await RecoveryRegistry.insertIncident({
        component: 'PROVIDER',
        description: details,
        resolution_action: 'FAILOVER',
        status: 'RESOLVED',
      });
    }
  }
}
