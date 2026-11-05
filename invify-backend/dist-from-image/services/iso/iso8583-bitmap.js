"use strict";
/** ISO 8583 bitmap helpers (MSB-first bit numbering; field N => bit N-1). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldIdsFromBitmaps = fieldIdsFromBitmaps;
exports.buildBitmapHex = buildBitmapHex;
exports.hasSecondaryBitmap = hasSecondaryBitmap;
function fieldIdsFromBitmaps(primaryHex, secondaryHex) {
    const ids = [];
    const primary = hexToBitmapBytes(primaryHex);
    for (let field = 2; field <= 64; field++) {
        if (isBitSet(primary, field))
            ids.push(field);
    }
    if (!secondaryHex)
        return ids;
    const secondary = hexToBitmapBytes(secondaryHex);
    for (let field = 65; field <= 128; field++) {
        if (isBitSet(secondary, field - 64))
            ids.push(field);
    }
    return ids;
}
function buildBitmapHex(fieldIds) {
    const ids = [...new Set(fieldIds)]
        .filter((id) => id >= 2 && id <= 128)
        .sort((a, b) => a - b);
    const needSecondary = ids.some((id) => id > 64);
    const primary = new Uint8Array(8);
    const secondary = needSecondary ? new Uint8Array(8) : undefined;
    for (const id of ids) {
        if (id <= 64) {
            setBit(primary, id);
        }
        else if (secondary) {
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
function hasSecondaryBitmap(primaryHex) {
    const primary = hexToBitmapBytes(primaryHex);
    return isBitSet(primary, 1);
}
function isBitSet(bytes, field) {
    const bitIndex = field - 1;
    const byteIndex = Math.floor(bitIndex / 8);
    const bitInByte = 7 - (bitIndex % 8);
    return (((bytes[byteIndex] ?? 0) >> bitInByte) & 1) === 1;
}
function setBit(bytes, field) {
    const bitIndex = field - 1;
    const byteIndex = Math.floor(bitIndex / 8);
    const bitInByte = 7 - (bitIndex % 8);
    bytes[byteIndex] |= 1 << bitInByte;
}
function hexToBitmapBytes(hex) {
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
function bytesToHex(bytes) {
    return Buffer.from(bytes).toString('hex').toUpperCase();
}
//# sourceMappingURL=iso8583-bitmap.js.map