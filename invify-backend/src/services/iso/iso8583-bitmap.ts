/** ISO 8583 bitmap helpers (MSB-first bit numbering; field N => bit N-1). */

export function fieldIdsFromBitmaps(
  primaryHex: string,
  secondaryHex?: string,
): number[] {
  const ids: number[] = [];
  const primary = hexToBitmapBytes(primaryHex);
  for (let field = 2; field <= 64; field++) {
    if (isBitSet(primary, field)) ids.push(field);
  }
  if (!secondaryHex) return ids;
  const secondary = hexToBitmapBytes(secondaryHex);
  for (let field = 65; field <= 128; field++) {
    if (isBitSet(secondary, field - 64)) ids.push(field);
  }
  return ids;
}

export function buildBitmapHex(fieldIds: number[]): {
  primaryHex: string;
  secondaryHex?: string;
} {
  const ids = [...new Set(fieldIds)]
    .filter((id) => id >= 2 && id <= 128)
    .sort((a, b) => a - b);
  const needSecondary = ids.some((id) => id > 64);
  const primary = new Uint8Array(8);
  const secondary = needSecondary ? new Uint8Array(8) : undefined;

  for (const id of ids) {
    if (id <= 64) {
      setBit(primary, id);
    } else if (secondary) {
      setBit(secondary, id - 64);
    }
  }
  if (needSecondary && secondary) {
    setBit(primary, 1);
  }

  return {
    primaryHex: bytesToHex(primary),
    secondaryHex: secondary ? bytesToHex(secondary) : undefined,
  };
}

export function hasSecondaryBitmap(primaryHex: string): boolean {
  const primary = hexToBitmapBytes(primaryHex);
  return isBitSet(primary, 1);
}

function isBitSet(bytes: Uint8Array, field: number): boolean {
  const bitIndex = field - 1;
  const byteIndex = Math.floor(bitIndex / 8);
  const bitInByte = 7 - (bitIndex % 8);
  return (((bytes[byteIndex] ?? 0) >> bitInByte) & 1) === 1;
}

function setBit(bytes: Uint8Array, field: number): void {
  const bitIndex = field - 1;
  const byteIndex = Math.floor(bitIndex / 8);
  const bitInByte = 7 - (bitIndex % 8);
  bytes[byteIndex] |= 1 << bitInByte;
}

function hexToBitmapBytes(hex: string): Uint8Array {
  const clean = hex.trim().toUpperCase();
  if (clean.length !== 16) {
    throw new Error(`Bitmap must be 16 hex chars, got ${clean.length}`);
  }
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex').toUpperCase();
}
