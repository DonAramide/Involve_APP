export declare class NightlyReconciliationJob {
    private quasarConnector;
    private dbStore;
    private investigationQueueService;
    private logger;
    constructor(quasarConnector: any, dbStore: any, investigationQueueService: any, logger: any);
    run(targetDate: string): Promise<void>;
    private compare;
}
