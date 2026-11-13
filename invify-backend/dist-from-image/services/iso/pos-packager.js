"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packPosMessage = packPosMessage;
exports.unpackPosMessage = unpackPosMessage;
exports.isoFieldsToLogRecord = isoFieldsToLogRecord;
const iso8583_bitmap_1 = require("./iso8583-bitmap");
const pos_packager_field_spec_1 = require("./pos-packager.field-spec");
function packPosMessage(fields) {
    const mti = normalizeMti(fields[0]);
    const bodyFieldIds = Object.keys(fields)
        .map((k) => Number(k))
        .filter((id) => id > 0 && fields[id] !== undefined && fields[id] !== '')
        .sort((a, b) => a - b);
    const { primaryHex, secondaryHex } = (0, iso8583_bitmap_1.buildBitmapHex)(bodyFieldIds);
    const parts = [Buffer.from(mti, 'ascii'), Buffer.from(primaryHex, 'ascii')];
    if (secondaryHex) {
        parts.push(Buffer.from(secondaryHex, 'ascii'));
    }
    for (const id of bodyFieldIds) {
        parts.push(packField(id, fields[id]));
    }
    return Buffer.concat(parts);
}
function unpackPosMessage(body) {
    let offset = 0;
    const mti = body.subarray(offset, offset + 4).toString('ascii');
    offset += 4;
    const primaryHex = body.subarray(offset, offset + 16).toString('ascii');
    offset += 16;
    let secondaryHex;
    if ((0, iso8583_bitmap_1.hasSecondaryBitmap)(primaryHex)) {
        secondaryHex = body.subarray(offset, offset + 16).toString('ascii');
        offset += 16;
    }
    const fieldIds = (0, iso8583_bitmap_1.fieldIdsFromBitmaps)(primaryHex, secondaryHex);
    const out = { 0: mti };
    for (const id of fieldIds) {
        const { value, nextOffset } = unpackField(id, body, offset);
        out[id] = value;
        offset = nextOffset;
    }
    return out;
}
function normalizeMti(value) {
    const raw = typeof value === 'string'
        ? value
        : value instanceof Buffer
            ? value.toString('ascii')
            : '0200';
    const mti = raw.replace(/\D/g, '').padStart(4, '0').slice(-4);
    if (mti.length !== 4) {
        throw new Error(`Invalid MTI: ${raw}`);
    }
    return mti;
}
function packField(id, value) {
    const spec = requireSpec(id);
    const buf = coerceFieldValue(value, spec);
    try {
        switch (spec.kind) {
            case 'fixed_numeric':
                return packFixedNumeric(buf, spec.max);
            case 'fixed_char':
                return packFixedChar(buf, spec.max);
            case 'll_numeric':
                return packLlNumeric(buf, spec.max);
            case 'll_char':
                return packLlChar(buf, spec.max);
            case 'lll_char':
                return packLllChar(buf, spec.max);
            case 'binary':
                return packBinary(buf, spec.max);
            default:
                throw new Error(`Unsupported field kind for ${id}`);
        }
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`ISO field ${id}: ${msg}`);
    }
}
function unpackField(id, body, offset) {
    const spec = requireSpec(id);
    switch (spec.kind) {
        case 'fixed_numeric': {
            const slice = body.subarray(offset, offset + spec.max);
            return { value: slice.toString('ascii'), nextOffset: offset + spec.max };
        }
        case 'fixed_char': {
            const slice = body.subarray(offset, offset + spec.max);
            return { value: slice.toString('ascii').trimEnd(), nextOffset: offset + spec.max };
        }
        case 'll_numeric': {
            const len = readLength(body, offset, 2);
            const start = offset + 2;
            const slice = body.subarray(start, start + len);
            return { value: slice.toString('ascii'), nextOffset: start + len };
        }
        case 'll_char': {
            const len = readLength(body, offset, 2);
            const start = offset + 2;
            const slice = body.subarray(start, start + len);
            return { value: slice.toString('ascii'), nextOffset: start + len };
        }
        case 'lll_char': {
            const len = readLength(body, offset, 3);
            const start = offset + 3;
            const slice = body.subarray(start, start + len);
            return { value: slice.toString('ascii'), nextOffset: start + len };
        }
        case 'binary': {
            // jPOS IFA_BINARY = AsciiHexInterpreter: N raw bytes ↔ 2N ASCII hex chars on wire
            const wireLen = spec.max * 2;
            if (offset + wireLen > body.length) {
                throw new Error(`Binary field ${id} truncated at offset ${offset} (need ${wireLen} hex ASCII chars)`);
            }
            const hex = body.subarray(offset, offset + wireLen).toString('ascii');
            if (!/^[0-9a-fA-F]+$/.test(hex)) {
                throw new Error(`Invalid ASCII-hex binary field ${id} at offset ${offset}`);
            }
            return { value: Buffer.from(hex, 'hex'), nextOffset: offset + wireLen };
        }
        default:
            throw new Error(`Unsupported field kind for ${id}`);
    }
}
function requireSpec(id) {
    const spec = (0, pos_packager_field_spec_1.getPosFieldSpec)(id);
    if (!spec) {
        throw new Error(`Unsupported ISO field id ${id} for PosPackager`);
    }
    return spec;
}
function coerceFieldValue(value, spec) {
    if (value instanceof Buffer) {
        return value;
    }
    const str = String(value).trim();
    if (spec.kind === 'binary') {
        const hex = str.replace(/\s/g, '');
        if (hex.length % 2 !== 0) {
            throw new Error(`Field ${spec.id}: invalid hex length`);
        }
        return Buffer.from(hex, 'hex');
    }
    return Buffer.from(str, 'ascii');
}
function packFixedNumeric(buf, len) {
    const digits = buf.toString('ascii').replace(/\D/g, '');
    if (digits.length > len) {
        throw new Error(`Numeric field exceeds ${len} digits`);
    }
    return Buffer.from(digits.padStart(len, '0'), 'ascii');
}
function packFixedChar(buf, len) {
    const str = buf.toString('ascii');
    if (str.length > len) {
        throw new Error(`Char field exceeds ${len} chars`);
    }
    return Buffer.from(str.padEnd(len, ' '), 'ascii');
}
function packLlNumeric(buf, max) {
    const digits = buf.toString('ascii').replace(/\D/g, '');
    if (digits.length > max) {
        throw new Error(`LL numeric field exceeds max ${max}`);
    }
    const lenPrefix = String(digits.length).padStart(2, '0');
    return Buffer.from(lenPrefix + digits, 'ascii');
}
function packLlChar(buf, max) {
    const str = buf.toString('ascii');
    if (str.length > max) {
        throw new Error(`LL char field exceeds max ${max}`);
    }
    const lenPrefix = String(str.length).padStart(2, '0');
    return Buffer.from(lenPrefix + str, 'ascii');
}
function packLllChar(buf, max) {
    const str = buf.toString('ascii');
    if (str.length > max) {
        throw new Error(`LLL char field exceeds max ${max}`);
    }
    const lenPrefix = String(str.length).padStart(3, '0');
    return Buffer.from(lenPrefix + str, 'ascii');
}
function packBinary(buf, len) {
    // jPOS IFA_BINARY (AsciiHexInterpreter): N bytes → 2N uppercase hex ASCII on wire
    if (buf.length !== len) {
        throw new Error(`Binary field must be exactly ${len} bytes (got ${buf.length})`);
    }
    return Buffer.from(buf.toString('hex').toUpperCase(), 'ascii');
}
function readLength(body, offset, digits) {
    const len = parseInt(body.subarray(offset, offset + digits).toString('ascii'), 10);
    if (!Number.isFinite(len) || len < 0) {
        throw new Error(`Invalid length prefix at offset ${offset}`);
    }
    return len;
}
/** Serialize fields for logs (binary → hex). */
function isoFieldsToLogRecord(fields) {
    const out = {};
    for (const [id, value] of Object.entries(fields)) {
        if (value instanceof Buffer) {
            out[id] = value.toString('hex').toUpperCase();
        }
        else {
            out[String(id)] = String(value);
        }
    }
    return out;
}
//# sourceMappingURL=pos-packager.js.map