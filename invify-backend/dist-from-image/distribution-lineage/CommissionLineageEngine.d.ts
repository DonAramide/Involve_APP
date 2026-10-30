export interface CommissionLineageRecord {
    commissionId: string;
    sourceTransactionId: string;
    replaySequence: number;
    commissionVersion: string;
    calculatedAmount: number;
    payoutAgentCode: string;
    lineageHash: string;
    createdAt: Date;
    status: 'PENDING' | 'SETTLED' | 'ROLLED_BACK' | 'RECALCULATED';
}
export declare class CommissionLineageEngine {
    /**
     * Records a deterministic, replay-safe commission attribution.
     */
    recordCommissionLineage(sourceTransactionId: string, replaySequence: number, commissionVersion: string, calculatedAmount: number, payoutAgentCode: string): CommissionLineageRecord;
    /**
     * Replays a commission sequence to ensure integrity and correct rollback state.
     */
    replayCommissionSequence(sourceTransactionId: string): CommissionLineageRecord[];
    private generateCommissionHash;
    private generateUuid;
}
