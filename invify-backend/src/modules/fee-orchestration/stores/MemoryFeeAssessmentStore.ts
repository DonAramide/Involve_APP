import {
  FeeAssessmentLine,
  FeeAssessmentSnapshot,
  FeeAssessmentStore,
} from '../types';

export class MemoryFeeAssessmentStore implements FeeAssessmentStore {
  private readonly byKey = new Map<string, { snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[] }>();

  private key(sourceSystem: string, sourceIdempotencyKey: string): string {
    return `${sourceSystem}\0${sourceIdempotencyKey}`;
  }

  private clone(row: { snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[] }) {
    return {
      snapshot: { ...row.snapshot },
      lines: row.lines.map((line) => ({ ...line })),
    };
  }

  public async findByIdempotency(
    sourceSystem: string,
    sourceIdempotencyKey: string,
  ): Promise<{ snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[] } | null> {
    const row = this.byKey.get(this.key(sourceSystem, sourceIdempotencyKey));
    return row ? this.clone(row) : null;
  }

  public async insert(
    snapshot: FeeAssessmentSnapshot,
    lines: FeeAssessmentLine[],
  ): Promise<{ snapshot: FeeAssessmentSnapshot; lines: FeeAssessmentLine[] }> {
    const k = this.key(snapshot.source_system, snapshot.source_idempotency_key);
    const existing = this.byKey.get(k);
    if (existing) {
      return this.clone(existing);
    }
    const stored = {
      snapshot: { ...snapshot },
      lines: lines.map((line) => ({ ...line, ledger_entry_id: null })),
    };
    this.byKey.set(k, stored);
    return this.clone(stored);
  }
}
