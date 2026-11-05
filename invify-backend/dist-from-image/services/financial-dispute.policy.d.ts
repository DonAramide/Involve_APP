export declare const DISPUTE_TYPES: readonly ["REFUND", "CHARGEBACK", "MANUAL_DEBIT"];
export type DisputeCaseType = (typeof DISPUTE_TYPES)[number];
export declare const DISPUTE_STATUSES: readonly ["PENDING_CHECKER", "APPROVED_EXECUTING", "POSTED", "REJECTED", "FAILED"];
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];
export declare class DisputePolicyError extends Error {
    status: number;
    constructor(message: string, status?: number);
}
export declare function normalizeEmail(value?: string | null): string;
export declare function assertCheckerIsNotMaker(params: {
    makerId?: string | null;
    makerEmail?: string | null;
    checkerId?: string | null;
    checkerEmail?: string | null;
}): void;
export declare function parseAmountKobo(body: {
    amountKobo?: unknown;
    amount_kobo?: unknown;
    amountNaira?: unknown;
    amount?: unknown;
}): number;
export declare function parseCaseType(raw: unknown): DisputeCaseType;
export declare function ledgerCreditAccount(type: DisputeCaseType): 'REFUNDS' | 'CHARGEBACKS' | 'ADJUSTMENTS';
export declare function isTransientQuasarError(err: {
    message?: string;
    responseCode?: string;
} | null | undefined): boolean;
export declare function koboToNaira(kobo: number): number;
