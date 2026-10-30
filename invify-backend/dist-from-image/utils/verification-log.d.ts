export type VerificationLogRow = {
    id: string;
    tenantId: string | null;
    email: string | null;
    phone: string | null;
    recipient: string;
    channel: string;
    purpose: string;
    status: string;
    displayStatus: string;
    attemptCount: number;
    expiresAt: string | null;
    verifiedAt: string | null;
    createdAt: string | null;
    otp: string | null;
};
export declare function verificationLogSelect(_includePlainCode?: boolean): string;
/** Prefer support plain_code; accept legacy 6-digit values in code. Never return a bcrypt hash. */
export declare function extractSupportOtp(row: any): string | null;
export declare function sanitizeVerificationSearch(raw: unknown): string;
export declare function toVerificationLogRow(row: any, now?: number): VerificationLogRow;
export declare function uniqueLatestByRecipient(rows: VerificationLogRow[]): VerificationLogRow[];
