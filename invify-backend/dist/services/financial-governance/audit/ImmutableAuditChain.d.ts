/**
 * ImmutableAuditChain — hash-chained audit record store.
 *
 * Each record carries the hash of the previous record so that any tampering
 * with a historical entry breaks the chain. Verification is O(n).
 *
 * Hash function: deterministic base64 of (prevHash + data) — lightweight
 * simulation suitable for in-process tests (not a cryptographic HMAC).
 */
export interface AuditChainRecord {
    seq: number;
    data: Record<string, any>;
    prevHash: string;
    hash: string;
    recordedAt: string;
}
export declare class ImmutableAuditChain {
    private static chain;
    static clearChain(): void;
    static append(data: Record<string, any>): AuditChainRecord;
    static getChain(): AuditChainRecord[];
    static length(): number;
    /**
     * Verifies the integrity of the entire chain.
     * Returns { valid: true } or { valid: false, brokenAtSeq: number, reason: string }.
     */
    static verify(): {
        valid: boolean;
        brokenAtSeq?: number;
        reason?: string;
    };
    /**
     * Tampers with a record at a given seq (test use only — proves verify() catches it).
     * Mutates both the data AND the stored hash, so the NEXT record's prevHash becomes invalid.
     */
    static _tamperForTesting(seq: number, newData: Record<string, any>): void;
}
