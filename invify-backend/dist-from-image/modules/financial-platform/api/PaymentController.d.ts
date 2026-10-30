export declare class PaymentController {
    private paymentOrchestratorService;
    private dbStore;
    constructor(paymentOrchestratorService: any, dbStore: any);
    createIntent(req: any, res: any): Promise<void>;
    getIntent(req: any, res: any): Promise<any>;
    cancelIntent(req: any, res: any): Promise<void>;
    refundIntent(req: any, res: any): Promise<void>;
    getHistory(req: any, res: any): Promise<void>;
}
