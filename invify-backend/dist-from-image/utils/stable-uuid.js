"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UUID_RE = void 0;
exports.asUuid = asUuid;
exports.toStableUuid = toStableUuid;
const crypto_1 = __importDefault(require("crypto"));
exports.UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function asUuid(value) {
    const s = String(value ?? '').trim();
    return exports.UUID_RE.test(s) ? s.toLowerCase() : null;
}
/** Deterministic UUID so local integer / INV-* keys upsert into UUID PKs. */
function toStableUuid(tenantId, entityType, raw) {
    const key = String(raw || '').trim();
    if (exports.UUID_RE.test(key))
        return key.toLowerCase();
    const hash = crypto_1.default
        .createHash('sha1')
        .update(`invify-school:${tenantId}:${entityType}:${key || crypto_1.default.randomUUID()}`)
        .digest();
    const bytes = Buffer.from(hash.subarray(0, 16));
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
//# sourceMappingURL=stable-uuid.js.map