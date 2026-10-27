import { createHash, randomBytes } from 'crypto';

export interface BarcodeToken {
  raw: string;
  sha256: string;
}

/** 32 cryptographically random bytes, encoded for Code 128 subset B. Only the hash is stored. */
export function createBarcodeToken(): BarcodeToken {
  const raw = randomBytes(32).toString('base64url');
  return { raw, sha256: sha256Hex(raw) };
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
