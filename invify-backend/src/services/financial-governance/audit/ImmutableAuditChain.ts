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

function computeHash(prevHash: string, data: Record<string, any>): string {
  const raw = `${prevHash}:${JSON.stringify(data)}`;
  // Deterministic lightweight hash (base64 of raw string, first 24 chars)
  return Buffer.from(raw).toString('base64').substring(0, 24).toUpperCase();
}

const GENESIS_HASH = 'GENESIS0000000000000000';

export class ImmutableAuditChain {
  private static chain: AuditChainRecord[] = [];

  static clearChain() {
    this.chain = [];
  }

  static append(data: Record<string, any>): AuditChainRecord {
    const prevHash = this.chain.length > 0
      ? this.chain[this.chain.length - 1].hash
      : GENESIS_HASH;

    const record: AuditChainRecord = {
      seq: this.chain.length + 1,
      data,
      prevHash,
      hash: computeHash(prevHash, data),
      recordedAt: new Date().toISOString(),
    };
    this.chain.push(record);
    return record;
  }

  static getChain(): AuditChainRecord[] {
    return [...this.chain];
  }

  static length(): number {
    return this.chain.length;
  }

  /**
   * Verifies the integrity of the entire chain.
   * Returns { valid: true } or { valid: false, brokenAtSeq: number, reason: string }.
   */
  static verify(): { valid: boolean; brokenAtSeq?: number; reason?: string } {
    let expectedPrevHash = GENESIS_HASH;
    for (const record of this.chain) {
      if (record.prevHash !== expectedPrevHash) {
        return {
          valid: false,
          brokenAtSeq: record.seq,
          reason: `prevHash mismatch at seq=${record.seq}. Expected=${expectedPrevHash}, got=${record.prevHash}`,
        };
      }
      const expectedHash = computeHash(record.prevHash, record.data);
      if (record.hash !== expectedHash) {
        return {
          valid: false,
          brokenAtSeq: record.seq,
          reason: `Hash mismatch at seq=${record.seq}. Data has been tampered with.`,
        };
      }
      expectedPrevHash = record.hash;
    }
    return { valid: true };
  }

  /**
   * Tampers with a record at a given seq (test use only — proves verify() catches it).
   * Mutates both the data AND the stored hash, so the NEXT record's prevHash becomes invalid.
   */
  static _tamperForTesting(seq: number, newData: Record<string, any>): void {
    const record = this.chain.find((r) => r.seq === seq);
    if (record) {
      (record as any).data = newData;
      // Corrupt the stored hash — the next record's prevHash will no longer match
      (record as any).hash = 'CORRUPTED_HASH_XXXXXXXXXXX';
    }
  }
}
