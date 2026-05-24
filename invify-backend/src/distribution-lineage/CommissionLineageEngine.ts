import * as crypto from 'crypto';

export interface CommissionLineageRecord {
  commissionId: string;
  sourceTransactionId: string;
  replaySequence: number; // Used to order replay events and detect missing ones
  commissionVersion: string; // Commission Snapshot Version (e.g., v4)
  calculatedAmount: number;
  payoutAgentCode: string;
  lineageHash: string;
  createdAt: Date;
  status: 'PENDING' | 'SETTLED' | 'ROLLED_BACK' | 'RECALCULATED';
}

export class CommissionLineageEngine {
  
  /**
   * Records a deterministic, replay-safe commission attribution.
   */
  public recordCommissionLineage(
    sourceTransactionId: string,
    replaySequence: number,
    commissionVersion: string,
    calculatedAmount: number,
    payoutAgentCode: string
  ): CommissionLineageRecord {
    
    const timestamp = new Date().toISOString();
    
    // Hash includes all deterministic inputs for replay verification
    const lineageHash = this.generateCommissionHash(
      sourceTransactionId,
      replaySequence,
      commissionVersion,
      calculatedAmount,
      payoutAgentCode,
      timestamp
    );

    const record: CommissionLineageRecord = {
      commissionId: this.generateUuid(),
      sourceTransactionId,
      replaySequence,
      commissionVersion,
      calculatedAmount,
      payoutAgentCode,
      lineageHash,
      createdAt: new Date(timestamp),
      status: 'PENDING',
    };

    // TODO: Persist immutable commission lineage record to DB
    return record;
  }

  /**
   * Replays a commission sequence to ensure integrity and correct rollback state.
   */
  public replayCommissionSequence(sourceTransactionId: string): CommissionLineageRecord[] {
    // TODO: Fetch all lineage records for sourceTransactionId ordered by replaySequence
    const records: CommissionLineageRecord[] = []; // Mock
    
    let previousSequence = 0;
    for (const record of records) {
      if (record.replaySequence <= previousSequence) {
        throw new Error(`Replay Integrity Error: Invalid sequence ordering for transaction ${sourceTransactionId}`);
      }
      
      const expectedHash = this.generateCommissionHash(
        record.sourceTransactionId,
        record.replaySequence,
        record.commissionVersion,
        record.calculatedAmount,
        record.payoutAgentCode,
        record.createdAt.toISOString()
      );

      if (record.lineageHash !== expectedHash) {
         throw new Error(`Replay Integrity Error: Hash mismatch at sequence ${record.replaySequence}`);
      }
      previousSequence = record.replaySequence;
    }

    return records;
  }

  private generateCommissionHash(
    txId: string,
    seq: number,
    version: string,
    amount: number,
    agentCode: string,
    timestamp: string
  ): string {
    const data = `${txId}|${seq}|${version}|${amount}|${agentCode}|${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
