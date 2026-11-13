export declare function isExistingVaError(message: string): boolean;
export declare function pickAccountFields(raw: any): {
    accountNumber: string;
    bankName: string;
    accountName?: string;
} | null;
export declare function last10PhoneDigits(raw: string | null | undefined): string;
