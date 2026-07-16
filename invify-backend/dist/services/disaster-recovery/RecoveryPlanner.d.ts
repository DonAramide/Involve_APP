export declare class RecoveryPlanner {
    /**
     * Run automated health sweeps across systems.
     */
    static runSelfHealingSweep(tenantIds: string[]): Promise<{
        repairsFired: number;
        queueJobsRecovered: number;
    }>;
    /**
     * Replays a failed incoming webhook message.
     */
    static replayWebhookMessage(msgId: string, webhookPayload: any): Promise<boolean>;
}
