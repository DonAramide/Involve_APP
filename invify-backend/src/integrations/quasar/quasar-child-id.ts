import crypto from 'crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when value is a canonical UUID string. */
export function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(String(value).trim());
}

/**
 * Deterministic UUID (v5-style) so the same tenant + external student key
 * always maps to the same Quasar child id. Quasar validates path params as UUID;
 * local school apps often send `stu-{admissionNumber}` instead.
 */
export function toQuasarChildUuid(tenantId: string, externalStudentKey: string): string {
  const key = String(externalStudentKey || '').trim();
  if (isUuid(key)) return key.toLowerCase();

  const seed = `invify:school-student:${String(tenantId).trim()}:${key}`;
  const hash = crypto.createHash('sha1').update(seed).digest();
  // RFC 4122 variant bits for name-based UUID
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
