export interface TransferMonitorSnapshot {
    pendingTransfers: number;
    completedTransfers: number;
    failedTransfers: number;
    /** Ratio: completed / (completed + failed), range [0,1] */
    successRate: number;
    averageLatencyMs: number;
    capturedAt: string;
}
export declare class TransferMonitor {
    /**
     * Returns real-time transfer queue metrics and success rate.
     */
    static getSnapshot(): Promise<TransferMonitorSnapshot>;
}
