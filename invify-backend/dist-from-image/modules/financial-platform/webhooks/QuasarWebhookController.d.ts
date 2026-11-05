export declare class QuasarWebhookController {
    private eventStore;
    private signatureValidator;
    private webhookDispatcher;
    private logger;
    constructor(eventStore: any, signatureValidator: any, webhookDispatcher: any, logger: any);
    handleWebhook(req: any, res: any): Promise<any>;
}
