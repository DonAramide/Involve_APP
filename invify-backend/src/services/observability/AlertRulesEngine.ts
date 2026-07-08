import { ObservabilityMetrics } from './ObservabilityMetrics';
import { ObservabilityRegistry, AlertIncident } from './ObservabilityRegistry';
import { StructuredLogger } from './StructuredLogger';

export interface AlertRule {
  name: string;
  metricName: string;
  labels: Record<string, string>;
  threshold: number;
  condition: 'GREATER_THAN' | 'LESS_THAN';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export class AlertRulesEngine {
  private static rules: AlertRule[] = [];

  static registerRule(rule: AlertRule) {
    this.rules.push(rule);
  }

  static getRules(): AlertRule[] {
    return this.rules;
  }

  static clearRules() {
    this.rules = [];
  }

  /**
   * Sweeps metrics and evaluates alerts. Fires alerts to ObservabilityRegistry.
   */
  static async evaluateRules(): Promise<AlertIncident[]> {
    const firedAlerts: AlertIncident[] = [];

    for (const rule of this.rules) {
      const val = ObservabilityMetrics.getGauge(rule.metricName, rule.labels);
      let isViolated = false;

      if (rule.condition === 'GREATER_THAN' && val > rule.threshold) {
        isViolated = true;
      } else if (rule.condition === 'LESS_THAN' && val < rule.threshold) {
        isViolated = true;
      }

      if (isViolated) {
        const details = `Alert rule '${rule.name}' triggered. Metric '${rule.metricName}' has value ${val} which violates threshold ${rule.threshold}`;
        
        // Log to structured logger
        StructuredLogger.warn(`[ALERT FIRED] ${details}`, {
          ruleName: rule.name,
          severity: rule.severity,
          metricValue: val,
        });

        // Insert incident
        const alertInc = await ObservabilityRegistry.insertAlert({
          rule_name: rule.name,
          severity: rule.severity,
          status: 'ACTIVE',
          details,
        });
        
        firedAlerts.push(alertInc);
      }
    }
    return firedAlerts;
  }
}
