export interface WebhookMonitorSnapshot {
    pendingWebhooks: number;
    completedWebhooks: number;
    failedWebhooks: number;
    /** Messages replayed from REPLAY queue */
    replayedWebhooks: number;
    /** Messages stranded in DLQ (undeliverable) */
    dlqDepth: number;
    averageLatencyMs: number;
    capturedAt: string;
}
export declare class WebhookMonitor {
    /**
     * Returns real-time webhook queue and DLQ metrics.
     */
    static getSnapshot(): Promise<WebhookMonitorSnapshot>;
}
