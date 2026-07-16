export declare class SystemTelemetryService {
    private static lastCpuTime;
    /**
     * Returns current real CPU usage percentage by comparing active/idle ticks over time
     */
    static getCpuUsage(): Promise<number>;
    /**
     * Helper to aggregate CPU ticks across all cores
     */
    private static getAverageCpu;
    /**
     * Returns a snapshot of system resource utilization matching the frontend Dashboard interface
     */
    static getLiveHardwareResources(): Promise<{
        cpu: {
            label: string;
            value: number;
            color: string;
        };
        memory: {
            label: string;
            value: number;
            color: string;
        };
        storage: {
            label: string;
            value: number;
            color: string;
        };
        network: {
            label: string;
            value: number;
            color: string;
        };
    }>;
}
