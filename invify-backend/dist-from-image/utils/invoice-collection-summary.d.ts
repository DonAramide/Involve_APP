export type CollectionSummary = {
    timezone: string;
    period: {
        start: string | null;
        end: string | null;
    };
    invoiced: number;
    recordedCollected: number;
    pending: number;
    settledFundsNote: string;
    rails: {
        cash: number;
        card: number;
        bankTransfer: number;
        vaTransfer: number;
        wallet: number;
    };
    invoiceCount: number;
};
/** Same rails as tablet salesPeriodTotals / salesRailTotals (confirmed collected only). */
export declare function collectionSummaryFromInvoices(invoices: any[] | null | undefined, period?: {
    start?: string | null;
    end?: string | null;
}): CollectionSummary;
