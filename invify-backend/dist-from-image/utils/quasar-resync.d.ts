export declare const QUASAR_RESYNC_LIMIT = 50;
export declare const QUASAR_RESYNC_DAYS = 20;
export declare function quasarEntryTimestamp(entry: any): number;
/**
 * Newest-first ledger page. Keep the latest 50 entries, and also any older
 * entry that still falls inside the last 20 days.
 */
export declare function selectQuasarResyncEntries(entriesNewestFirst: any[], now?: number): any[];
export declare function quasarLedgerAmountNaira(entry: any): number;
export declare function isQuasarCreditEntry(entry: any): boolean;
/** Same amount within 2 minutes — webhook qfs_credit_* vs ledger id. */
export declare function isSameQuasarCredit(left: {
    amount: number;
    createdAt?: string;
}, right: {
    amount: number;
    createdAt?: string;
}): boolean;
export declare function quasarLedgerReference(entry: any, accountId: string): string;
