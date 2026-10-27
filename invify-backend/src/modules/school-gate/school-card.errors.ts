export class SchoolCardError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'SchoolCardError';
  }
}

export const SCHEMA_UNAPPLIED = new SchoolCardError(
  'School ID card storage is not available. Migration 20261026233000 is still unapplied, so settings and cards are not saved.',
  503,
  'SCHOOL_GATE_SCHEMA_UNAPPLIED',
);
