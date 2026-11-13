import { FeeAssessmentLine, FeeAssessmentSnapshot, FeeAssessmentStore } from '../types';
export declare class SupabaseFeeAssessmentStore implements FeeAssessmentStore {
    findByIdempotency(sourceSystem: string, sourceIdempotencyKey: string): Promise<{
        snapshot: FeeAssessmentSnapshot;
        lines: FeeAssessmentLine[];
    } | null>;
    insert(snapshot: FeeAssessmentSnapshot, lines: FeeAssessmentLine[]): Promise<{
        snapshot: FeeAssessmentSnapshot;
        lines: FeeAssessmentLine[];
    }>;
}
