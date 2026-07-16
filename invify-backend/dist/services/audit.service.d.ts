export type FinancialAuditEvents = 'payment.intent.created' | 'webhook.received' | 'payment.success' | 'payment.failed' | 'virtual_account.created' | 'virtual_account.failed' | 'payout.initiated';
/**
 * AuditService provides an immutable trail of financial events.
 * Rule: Logs are append-only. No updates or deletions allowed.
 */
export declare class AuditService {
    /**
     * Records a financial event in the audit log.
     */
    static log(params: {
        eventType: FinancialAuditEvents;
        reference: string;
        tenantId: string;
        payload: any;
    }): Promise<void>;
}
