/**
 * Status buckets for premium invoices and payments.
 * Amounts are summed only when the source field is an integer minor unit.
 * A missing amount is reported as unknown rather than zero.
 */
export interface StatusAmountBucket {
    status: string;
    count: number;
    amountMinor: number | null;
}
export declare function integerMinor(value: unknown): number | null;
/**
 * Outstanding premium is amount_due_minor minus amount_paid_minor on issued and
 * partially paid invoices. Drafts, voids, paid, and refunded invoices are not open.
 * A missing or non-integer amount makes the total unavailable.
 * An empty open set is a real zero after a successful read.
 */
export declare function outstandingPremiumMinor(rows: any[] | null | undefined): number | null;
/** Successful payment minor units only. Refunded and reversed rows are excluded. */
export declare function collectedPremiumMinor(rows: any[] | null | undefined): number | null;
/** Successful payments that also have a reconciliation timestamp. */
export declare function reconciledCollectionMinor(rows: any[] | null | undefined): number | null;
/**
 * Collection rate in basis points. A zero or missing billed total is not a rate.
 */
export declare function collectionRateBps(billedMinor: number | null, collectedMinor: number | null): number | null;
export declare function commandPremiumTotals(invoices: any[] | null | undefined, payments: any[] | null | undefined, from: string | null, to: string | null): {
    billedMinor: number | null;
    collectedMinor: number | null;
    reconciledMinor: number | null;
    outstandingMinor: number | null;
    collectionRateBps: number | null;
};
export interface PremiumMonthPoint {
    month: string;
    invoicedMinor: number;
    collectedMinor: number;
}
/**
 * Monthly invoiced premium uses issued_at. Collected premium uses successful
 * payments by created_at. Rows without a usable timestamp are counted aside
 * and are not placed in a guessed month.
 */
export declare function premiumMonthSeries(invoices: any[] | null | undefined, payments: any[] | null | undefined, from: string | null, to: string | null): {
    points: PremiumMonthPoint[];
    undatedInvoices: number;
    undatedPayments: number;
    incomplete: boolean;
};
/**
 * Billed premium is the sum of persisted invoice minor units, excluding drafts and voids.
 * Collected premium is the sum of hw_payments rows whose status is successful.
 * Either total is null when a persisted amount is missing or not an integer minor unit.
 */
export declare function premiumOverviewTotals(invoices: any[] | null | undefined, payments: any[] | null | undefined): {
    billedMinor: number | null;
    collectedMinor: number | null;
};
export declare function summarizeStatusAmounts(rows: any[] | null | undefined, amountKey: string): StatusAmountBucket[];
