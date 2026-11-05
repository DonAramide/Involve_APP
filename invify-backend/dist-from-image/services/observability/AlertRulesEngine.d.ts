import { AlertIncident } from './ObservabilityRegistry';
export interface AlertRule {
    name: string;
    metricName: string;
    labels: Record<string, string>;
    threshold: number;
    condition: 'GREATER_THAN' | 'LESS_THAN';
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
}
export declare class AlertRulesEngine {
    private static rules;
    static registerRule(rule: AlertRule): void;
    static getRules(): AlertRule[];
    static clearRules(): void;
    /**
     * Sweeps metrics and evaluates alerts. Fires alerts to ObservabilityRegistry.
     */
    static evaluateRules(): Promise<AlertIncident[]>;
}
