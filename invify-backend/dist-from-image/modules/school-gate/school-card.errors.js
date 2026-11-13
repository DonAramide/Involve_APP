"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_UNAPPLIED = exports.SchoolCardError = void 0;
class SchoolCardError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'SchoolCardError';
    }
}
exports.SchoolCardError = SchoolCardError;
exports.SCHEMA_UNAPPLIED = new SchoolCardError('School ID card storage is not available. Migration 20261026233000 is still unapplied, so settings and cards are not saved.', 503, 'SCHOOL_GATE_SCHEMA_UNAPPLIED');
//# sourceMappingURL=school-card.errors.js.map