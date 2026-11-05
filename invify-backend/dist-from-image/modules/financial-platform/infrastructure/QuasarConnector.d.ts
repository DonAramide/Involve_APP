export declare class QuasarConnector {
    private vaultService;
    private httpService;
    constructor(vaultService: any, httpService: any);
    createPaymentIntent(tenantId: string, payload: any, idempotencyKey: string): Promise<import("../../../integrations/quasar").PaymentIntent>;
    getPaymentStatus(tenantId: string, intentId: string): Promise<import("../../../integrations/quasar").PaymentIntent>;
    createRefund(tenantId: string, intentId: string, amount: number, idempotencyKey: string): Promise<any>;
    getSettlements(tenantId: string, date: string): Promise<any>;
}
