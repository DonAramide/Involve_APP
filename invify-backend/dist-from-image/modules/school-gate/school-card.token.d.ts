export interface BarcodeToken {
    raw: string;
    sha256: string;
}
/** 32 cryptographically random bytes, encoded for Code 128 subset B. Only the hash is stored. */
export declare function createBarcodeToken(): BarcodeToken;
export declare function sha256Hex(value: string): string;
