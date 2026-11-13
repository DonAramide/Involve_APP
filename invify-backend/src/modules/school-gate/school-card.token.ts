import { createHash, randomBytes } from 'crypto';

export interface BarcodeToken {
  raw: string;
  sha256: string;
}

/**
 * Opaque gate token for Code 128 subset B.
 * 15 random bytes → 20 base64url chars (gate minimum is 20). Shorter than the
 * legacy 43-char tokens so a linear barcode stays scannable on CR80 cards.
 * Only the SHA-256 is stored; existing longer tokens remain valid.
 */
export function createBarcodeToken(): BarcodeToken {
  const raw = randomBytes(15).toString('base64url'); // exactly 20 chars
  return { raw, sha256: sha256Hex(raw) };
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
