import { ProviderFailoverService, ProviderType } from '../disaster-recovery/ProviderFailoverService';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerEntry {
  provider: ProviderType;
  state: CircuitState;
  consecutiveFailures: number;
  isHealthy: boolean;
  /** Timestamp when the circuit last tripped (null = never) */
  lastTripAt: string | null;
}

export interface CircuitBreakerSnapshot {
  totalCircuits: number;
  closedCircuits: number;
  openCircuits: number;
  halfOpenCircuits: number;
  circuits: CircuitBreakerEntry[];
  capturedAt: string;
}

const ALL_PROVIDERS: ProviderType[] = ['PAYSTACK', 'FLUTTERWAVE', 'PROVIDUS', 'WEMA'];

// Threshold at which a circuit enters HALF_OPEN (recovery probe mode)
// When consecutiveFailures > 0 but < FAILURE_THRESHOLD it is HALF_OPEN
const FAILURE_THRESHOLD = 3;

export class CircuitBreakerMonitor {
  private static tripTimestamps: Map<ProviderType, string> = new Map();

  static clearTripHistory() {
    this.tripTimestamps.clear();
  }

  /**
   * Records a trip timestamp for a provider (called externally when failover fires).
   */
  static recordTrip(provider: ProviderType) {
    this.tripTimestamps.set(provider, new Date().toISOString());
  }

  /**
   * Derives circuit breaker state from ProviderFailoverService health data.
   *
   *  CLOSED     → isHealthy = true, consecutiveFailures = 0
   *  HALF_OPEN  → isHealthy = true but 0 < consecutiveFailures < THRESHOLD
   *  OPEN       → isHealthy = false (threshold crossed)
   */
  static getSnapshot(): CircuitBreakerSnapshot {
    const circuits: CircuitBreakerEntry[] = ALL_PROVIDERS.map((provider) => {
      const health = ProviderFailoverService.getHealthStatus(provider);

      let state: CircuitState;
      if (!health.isHealthy) {
        state = 'OPEN';
      } else if (health.consecutiveFailures > 0 && health.consecutiveFailures < FAILURE_THRESHOLD) {
        state = 'HALF_OPEN';
      } else {
        state = 'CLOSED';
      }

      return {
        provider,
        state,
        consecutiveFailures: health.consecutiveFailures,
        isHealthy: health.isHealthy,
        lastTripAt: this.tripTimestamps.get(provider) || null,
      };
    });

    return {
      totalCircuits: circuits.length,
      closedCircuits: circuits.filter((c) => c.state === 'CLOSED').length,
      openCircuits: circuits.filter((c) => c.state === 'OPEN').length,
      halfOpenCircuits: circuits.filter((c) => c.state === 'HALF_OPEN').length,
      circuits,
      capturedAt: new Date().toISOString(),
    };
  }
}
