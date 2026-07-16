export interface AlertIncident {
    id: string;
    rule_name: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    status: 'ACTIVE' | 'RESOLVED';
    details: string;
    triggered_at: string;
    resolved_at: string | null;
}
export declare class ObservabilityRegistry {
    private static mockAlerts;
    private static useMock;
    static clearMockData(): void;
    static getMockAlerts(): AlertIncident[];
    static insertAlert(alert: Partial<AlertIncident>): Promise<AlertIncident>;
    static resolveAlert(id: string): Promise<void>;
}
