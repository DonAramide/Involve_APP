import { AssessRequest, AssessResult, FeeAssessmentStore, FeeProfileCatalog } from './types';
/**
 * Shadow-capable fee assessment. Persists snapshot + four lines.
 * Does not post ledger entries, debit customers, or mutate wallet balances.
 */
export declare class FeeOrchestrator {
    private readonly store;
    private readonly resolver;
    constructor(catalog: FeeProfileCatalog, store: FeeAssessmentStore);
    assess(request: AssessRequest): Promise<AssessResult>;
}
