import { PaymentIntentState } from '../domain/state-machines/PaymentStateMachine';
export declare class PaymentOrchestratorService {
    private quasarConnector;
    private billingGovernanceService;
    private queueService;
    private logger;
    constructor(quasarConnector: any, billingGovernanceService: any, queueService: any, logger: any);
    createPaymentIntent(tenantId: string, invoiceId: string, amount: number, currency: string): Promise<{
        intentId: any;
        correlationId: `${string}-${string}-${string}-${string}-${string}`;
        status: PaymentIntentState;
    }>;
    private saveLocalIntent;
}
