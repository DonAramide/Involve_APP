export declare class SchoolCardError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(message: string, status: number, code: string);
}
export declare const SCHEMA_UNAPPLIED: SchoolCardError;
