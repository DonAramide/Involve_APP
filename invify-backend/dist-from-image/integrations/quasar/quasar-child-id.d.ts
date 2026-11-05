/** True when value is a canonical UUID string. */
export declare function isUuid(value: string | null | undefined): boolean;
/**
 * Deterministic UUID (v5-style) so the same tenant + external student key
 * always maps to the same Quasar child id. Quasar validates path params as UUID;
 * local school apps often send `stu-{admissionNumber}` instead.
 */
export declare function toQuasarChildUuid(tenantId: string, externalStudentKey: string): string;
