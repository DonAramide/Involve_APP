export type BillingPaymentStage = 'submitted' | 'posted' | 'rejected';
export declare function notifyTenantBillingPayment(input: {
    tenantId: string;
    stage: BillingPaymentStage;
    amountLabel?: string;
    amountKobo?: number;
    reference?: string;
}): Promise<void>;
