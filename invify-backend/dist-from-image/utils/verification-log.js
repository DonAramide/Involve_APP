"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationLogSelect = verificationLogSelect;
exports.extractSupportOtp = extractSupportOtp;
exports.sanitizeVerificationSearch = sanitizeVerificationSearch;
exports.toVerificationLogRow = toVerificationLogRow;
exports.uniqueLatestByRecipient = uniqueLatestByRecipient;
const LOG_COLUMNS = 'id, tenant_id, email, phone, channel, purpose, status, attempt_count, expires_at, verified_at, created_at, plain_code';
function verificationLogSelect(_includePlainCode = false) {
    return LOG_COLUMNS;
}
/** Prefer support plain_code; accept legacy 6-digit values in code. Never return a bcrypt hash. */
function extractSupportOtp(row) {
    const candidates = [row?.plain_code, row?.otp, row?.code];
    for (const raw of candidates) {
        const value = String(raw || '').trim();
        if (/^\d{6}$/.test(value))
            return value;
    }
    return null;
}
function sanitizeVerificationSearch(raw) {
    return String(raw || '')
        .trim()
        .slice(0, 120)
        .replace(/[^a-zA-Z0-9@.+\-]/g, '');
}
function toVerificationLogRow(row, now = Date.now()) {
    const rawStatus = String(row?.status || '').toUpperCase();
    const expiresAtMs = row?.expires_at ? new Date(row.expires_at).getTime() : 0;
    const displayStatus = rawStatus === 'PENDING' && expiresAtMs > 0 && expiresAtMs < now ? 'EXPIRED' : rawStatus;
    return {
        id: String(row?.id || ''),
        tenantId: row?.tenant_id || null,
        email: row?.email || null,
        phone: row?.phone || null,
        recipient: row?.email || row?.phone || '—',
        channel: String(row?.channel || ''),
        purpose: String(row?.purpose || ''),
        status: rawStatus,
        displayStatus,
        attemptCount: Number(row?.attempt_count || 0),
        expiresAt: row?.expires_at || null,
        verifiedAt: row?.verified_at || null,
        createdAt: row?.created_at || null,
        otp: extractSupportOtp(row),
    };
}
function uniqueLatestByRecipient(rows) {
    const seen = new Set();
    const out = [];
    for (const row of rows) {
        const key = String(row.email || row.phone || row.id).trim().toLowerCase();
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        out.push(row);
    }
    return out;
}
//# sourceMappingURL=verification-log.js.map