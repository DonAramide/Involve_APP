/**
 * Object-storage key builders (G13). Keys use trusted identity, never client body paths.
 * Live bucket ACL / public URL fetch remain UNVERIFIED (no live Contabo access).
 */

const UNSAFE_KEY = /(?:^|[\\/])(?:\.\.|[a-z]+:)/i;

export function sanitizeStorageExt(originalName: string, fallback = '.bin'): string {
  const original = String(originalName || 'document.bin');
  const ext = (original.includes('.') ? original.slice(original.lastIndexOf('.')) : fallback).toLowerCase();
  if (!/^\.[a-z0-9]{1,8}$/.test(ext)) return fallback;
  return ext;
}

export function tenantCacObjectKey(tenantId: string, originalName: string, now = Date.now()): string {
  const id = String(tenantId || '').trim();
  if (!id) throw new Error('tenant id required for CAC object key');
  const ext = sanitizeStorageExt(originalName, '.jpg');
  return `tenants/${id}/cac/${now}${ext}`;
}

export function userKycObjectKey(authUserId: string, docType: string, originalName: string, now = Date.now()): string {
  const id = String(authUserId || '').trim();
  if (!id) throw new Error('authenticated user id required for KYC object key');
  const type = String(docType || 'document').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const ext = sanitizeStorageExt(originalName, '.bin');
  return `tenants/${id}/kyc/${type}-${now}${ext}`;
}

/** Reject client-supplied object keys / paths that would rewrite storage location. */
export function rejectClientControlledStoragePath(body: Record<string, unknown> | undefined | null): void {
  if (!body || typeof body !== 'object') return;
  for (const field of ['key', 'objectKey', 'path', 'object_path', 'storageKey', 'storage_path']) {
    const value = body[field];
    if (value == null || value === '') continue;
    const s = String(value);
    if (s.includes('/') || s.includes('\\') || UNSAFE_KEY.test(s) || s.startsWith('tenants/')) {
      const err: any = new Error('Client-controlled storage path is not allowed');
      err.status = 400;
      throw err;
    }
  }
}
