import { ObservabilityMetrics } from '../observability/ObservabilityMetrics';
import { AlertRulesEngine } from '../observability/AlertRulesEngine';
import { AlertIncident } from '../observability/ObservabilityRegistry';

export interface LiquiditySnapshot {
  /** Total float available in the banking pool (NGN, paise) */
  totalFloat: number;
  /** Amount currently allocated/utilized */
  utilized: number;
  /** Remaining available float */
  available: number;
  /** Ratio: available / totalFloat — range [0,1] */
  coverageRatio: number;
  /** True when coverageRatio < LOW_LIQUIDITY_THRESHOLD */
  lowLiquidityAlert: boolean;
  /** Fired alert incidents if threshold was crossed */
  alerts: AlertIncident[];
  capturedAt: string;
}

const LOW_LIQUIDITY_THRESHOLD = 0.20;
const LIQUIDITY_ALERT_RULE = 'liquidity_coverage_ratio_low';

export class LiquidityMonitor {
  private static totalFloat = 0;
  private static utilized = 0;

  static clearMockData() {
    this.totalFloat = 0;
    this.utilized = 0;
  }

  /**
   * Seeds the mock liquidity pool for testing and ops monitoring.
   */
  static seedPool(totalFloat: number, utilized: number) {
    this.totalFloat = totalFloat;
    this.utilized = utilized;

    // Mirror into ObservabilityMetrics so AlertRulesEngine can evaluate
    const available = totalFloat - utilized;
    const ratio = totalFloat > 0 ? available / totalFloat : 1;
    ObservabilityMetrics.setGauge('liquidity_coverage_ratio', parseFloat(ratio.toFixed(4)));
    ObservabilityMetrics.setGauge('liquidity_total_float', totalFloat);
    ObservabilityMetrics.setGauge('liquidity_utilized', utilized);
  }

  /**
   * Evaluates liquidity health and fires alert rules when ratio is low.
   */
  static async getSnapshot(): Promise<LiquiditySnapshot> {
    const available = this.totalFloat - this.utilized;
    const coverageRatio = this.totalFloat > 0 ? available / this.totalFloat : 1;
    const lowLiquidityAlert = coverageRatio < LOW_LIQUIDITY_THRESHOLD;

    let alerts: AlertIncident[] = [];
    if (lowLiquidityAlert) {
      // Register a transient alert rule idempotently (guard against double-registration)
      const existingRules = AlertRulesEngine.getRules();
      if (!existingRules.some((r) => r.name === LIQUIDITY_ALERT_RULE)) {
        AlertRulesEngine.registerRule({
          name: LIQUIDITY_ALERT_RULE,
          metricName: 'liquidity_coverage_ratio',
          labels: {},
          threshold: LOW_LIQUIDITY_THRESHOLD,
          condition: 'LESS_THAN',
          severity: 'CRITICAL',
        });
      }
      alerts = await AlertRulesEngine.evaluateRules();
    }

    return {
      totalFloat: this.totalFloat,
      utilized: this.utilized,
      available,
      coverageRatio: parseFloat(coverageRatio.toFixed(4)),
      lowLiquidityAlert,
      alerts,
      capturedAt: new Date().toISOString(),
    };
  }
}
