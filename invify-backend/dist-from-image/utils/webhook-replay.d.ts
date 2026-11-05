/**
 * Utility to replay webhooks that failed and were persisted in the Dead Letter Queue.
 */
export declare class WebhookReplayUtility {
    static replayPending(batchSize?: number): Promise<void>;
}
