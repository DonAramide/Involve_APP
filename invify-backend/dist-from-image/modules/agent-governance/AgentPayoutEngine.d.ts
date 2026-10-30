export declare enum PayoutState {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    REVERSED = "REVERSED",
    UNDER_REVIEW = "UNDER_REVIEW"
}
export interface PayoutRecord {
    payoutId: string;
    agentCode: string;
    amount: number;
    currency: string;
    destination: string;
    state: PayoutState;
    auditLineageIds: string[];
    retryCount: number;
    scheduledFor: Date;
    processedAt?: Date;
}
export declare class AgentPayoutEngine {
    /**
     * Batches pending commissions into a payout record for an agent.
     */
    batchPayout(agentCode: string, commissionIds: string[], totalAmount: number, destination: string): PayoutRecord;
    /**
     * Processes a payout, integrating with the external wallet/settlement system.
     */
    processPayout(payoutId: string): Promise<void>;
    private generateUuid;
}
