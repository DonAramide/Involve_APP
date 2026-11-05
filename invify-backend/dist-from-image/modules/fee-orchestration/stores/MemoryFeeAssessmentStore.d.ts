import { FeeAssessmentLine, FeeAssessmentSnapshot, FeeAssessmentStore } from '../types';
export declare class MemoryFeeAssessmentStore implements FeeAssessmentStore {
    private readonly byKey;
    private key;
    private clone;
    findByIdempotency(sourceSystem: string, sourceIdempotencyKey: string): Promise<{
        snapshot: FeeAssessmentSnapshot;
        lines: FeeAssessmentLine[];
    } | null>;
    insert(snapshot: FeeAssessmentSnapshot, lines: FeeAssessmentLine[]): Promise<{
        snapshot: FeeAssessmentSnapshot;
        lines: FeeAssessmentLine[];
    }>;
}
