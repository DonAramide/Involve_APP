export declare class ObservabilityMetrics {
    private static counters;
    private static gauges;
    static clearMetrics(): void;
    /** Returns the number of distinct gauge keys currently tracked. */
    static getGaugeCount(): number;
    /** Returns the number of distinct counter keys currently tracked. */
    static getCounterCount(): number;
    static incrementCounter(name: string, labels?: Record<string, string>): void;
    static setGauge(name: string, value: number, labels?: Record<string, string>): void;
    static getGauge(name: string, labels?: Record<string, string>): number;
    private static formatKey;
    /**
     * Generates standard Prometheus exposition text format.
     */
    static exportPrometheus(): string;
}
