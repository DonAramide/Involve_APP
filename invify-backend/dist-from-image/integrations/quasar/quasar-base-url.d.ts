/** Normalize to …/api/v1 without trailing slash. Accepts full card-tx URLs. */
export declare function normalizeQuasarBaseUrl(input: string | null | undefined): string;
export declare function invalidateQuasarBaseUrlCache(): void;
/** Call after superadmin saves quasar_base_url so new clients pick it up immediately. */
export declare function setQuasarBaseUrlOverride(url: string | null | undefined): void;
export declare function resolveQuasarBaseUrl(): string;
export declare function quasarCardTransactionUrl(): string;
export declare function quasarIccDataUrl(): string;
