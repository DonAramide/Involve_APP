"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryFeeAssessmentStore = void 0;
class MemoryFeeAssessmentStore {
    byKey = new Map();
    key(sourceSystem, sourceIdempotencyKey) {
        return `${sourceSystem}\0${sourceIdempotencyKey}`;
    }
    clone(row) {
        return {
            snapshot: { ...row.snapshot },
            lines: row.lines.map((line) => ({ ...line })),
        };
    }
    async findByIdempotency(sourceSystem, sourceIdempotencyKey) {
        const row = this.byKey.get(this.key(sourceSystem, sourceIdempotencyKey));
        return row ? this.clone(row) : null;
    }
    async insert(snapshot, lines) {
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
exports.MemoryFeeAssessmentStore = MemoryFeeAssessmentStore;
//# sourceMappingURL=MemoryFeeAssessmentStore.js.map