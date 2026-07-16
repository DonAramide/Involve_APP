export interface SettlementSnapshot {
    pendingSettlements: number;
    completedSettlements: number;
    failedSettlements: number;
    dlqDepth: number;
    averageLatencyMs: number;
    capturedAt: string;
}
export declare class SettlementMonitor {
    /**
     * Returns real-time settlement queue metrics.
     */
    static getSnapshot(): Promise<SettlementSnapshot>;
}
