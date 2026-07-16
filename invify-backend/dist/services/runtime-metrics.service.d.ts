export declare class RuntimeMetricsService {
    static get_banking_operations_dashboard(): Promise<{
        webhookVolume: number;
        totalRetryAttempts: number;
        activeOutagesCount: number;
        circuitTransitionsTotal: number;
        providers: {
            name: any;
            state: any;
            healthScore: any;
            avgLatencyMs: any;
        }[];
    }>;
}
