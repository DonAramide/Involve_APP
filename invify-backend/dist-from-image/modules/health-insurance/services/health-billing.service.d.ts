import { HealthContext } from '../types';
export declare class HealthBillingService {
    /**
     * Issue a premium invoice for an enrolment.
     */
    static issuePremiumInvoice(ctx: HealthContext, params: {
        enrolmentId: string;
        payerType: 'school' | 'employer' | 'guardian' | 'staff' | 'member';
        payerUserId?: string;
        guardianLinkId?: string;
        dueDate: string;
    }): Promise<any>;
    /**
     * Initiate payment for a health premium invoice.
     */
    static initiatePayment(ctx: HealthContext, invoiceId: string, params: {
        idempotencyKey: string;
        paymentChannel: 'quasar_va' | 'quasar_card' | 'quasar_direct' | 'manual_reconciled';
    }): Promise<any>;
    /**
     * Process payment confirmation event (from Quasar webhook or verification).
     * Atomically:
     *  1. Marks payment as 'successful' with verified_at.
     *  2. Allocates payment to invoice in hw_payment_allocations.
     *  3. Updates invoice amount_paid_minor and marks status='paid'.
     *  4. Transitions enrolment from awaiting_premium_payment to awaiting_insurer_activation.
     *  5. Records double-entry in the platform ledger.
     */
    static processPaymentConfirmation(tenantId: string, paymentId: string, invoiceId: string, quasarReference: string): Promise<{
        success: boolean;
        message: string;
    } | {
        success: boolean;
        message?: undefined;
    }>;
}
