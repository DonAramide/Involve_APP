import crypto from 'crypto';

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function asUuid(value: unknown): string | null {
  const s = String(value ?? '').trim();
  return UUID_RE.test(s) ? s.toLowerCase() : null;
}

/** Deterministic UUID so local integer / INV-* keys upsert into UUID PKs. */
export function toStableUuid(tenantId: string, entityType: string, raw: string): string {
  const key = String(raw || '').trim();
  if (UUID_RE.test(key)) return key.toLowerCase();
  const hash = crypto
    .createHash('sha1')
    .update(`invify-school:${tenantId}:${entityType}:${key || crypto.randomUUID()}`)
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
