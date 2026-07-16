export declare class QuasarEventGatewayService {
    /**
     * Reports execution results of outbound transfers to Quasar.
     * Updates financial event state and logs the transactions within Quasar.
     */
    static publishOutboundExecution(params: {
        transferLogId: string;
        financialEventId: string;
        tenantId: string;
        amount: number;
        fee: number;
        reference: string;
        status: 'SUCCESS' | 'FAILED' | 'PENDING';
        provider: string;
        providerReference: string;
        error?: string;
    }): Promise<void>;
    /**
     * Reports inbound webhook credit events to Quasar.
     * Triggers Quasar transaction posting and reconciliation.
     */
    static publishInboundCredit(params: {
        tenantId: string;
        amount: number;
        reference: string;
        provider: string;
        providerReference: string;
        accountNumber: string;
        rawPayload: any;
    }): Promise<void>;
}
