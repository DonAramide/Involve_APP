export type InvoiceRail = 'cash' | 'card' | 'va_transfer' | 'bank_transfer' | 'wallet' | 'other';
/**
 * Classify an invoice payment_method for dashboard rails.
 *
 * Wallet = customer store credit (not the tenant payout wallet).
 * VirtualAccount = paid into an Invify/Quasar VA (customer or staff).
 * Transfer = paid into the tenant's own/personal bank account — not Quasar.
 */
export declare function classifyInvoicePaymentMethod(raw?: string | null): InvoiceRail;
export declare function isQuasarInvoiceRail(rail: InvoiceRail): boolean;
