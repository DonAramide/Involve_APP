export declare class InvestigationQueueService {
    private dbStore;
    private logger;
    constructor(dbStore: any, logger: any);
    flagDiscrepancy(payload: {
        tenantId: string;
        targetType: string;
        targetId: string;
        discrepancyType: string;
        invifyState: any;
        quasarState: any;
    }): Promise<any>;
    resolveDiscrepancy(recordId: string, resolutionNotes: string): Promise<any>;
}
