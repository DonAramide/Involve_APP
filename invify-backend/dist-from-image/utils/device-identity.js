"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDeviceId = normalizeDeviceId;
exports.isPlaceholderDeviceId = isPlaceholderDeviceId;
exports.isUsableDeviceId = isUsableDeviceId;
exports.displayableDeviceId = displayableDeviceId;
exports.findPlaceholderRegistration = findPlaceholderRegistration;
exports.deviceIdsMatch = deviceIdsMatch;
exports.emptyEmailDeviceResolution = emptyEmailDeviceResolution;
exports.uniqueDeviceIds = uniqueDeviceIds;
const UNUSABLE_DEVICE_IDS = new Set([
    'UNKNOWN',
    'NULL',
    'NONE',
    '0',
    'M1AJQ',
    'WEBCLIENT',
    'IOSDEVICE',
    'MACOSDEVICE',
    'UNASSIGNED',
    'WEBPORTAL',
    'WEBISSUER',
]);
function normalizeDeviceId(id) {
    return String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}
function isPlaceholderDeviceId(id) {
    const raw = String(id || '').trim();
    if (!raw)
        return true;
    const clean = normalizeDeviceId(raw);
    if (!clean)
        return true;
    return UNUSABLE_DEVICE_IDS.has(clean);
}
function isUsableDeviceId(id) {
    const clean = normalizeDeviceId(id);
    if (clean.length < 4)
        return false;
    return !UNUSABLE_DEVICE_IDS.has(clean);
}
function displayableDeviceId(id) {
    const raw = String(id || '').trim();
    if (!raw || isPlaceholderDeviceId(raw))
        return null;
    return raw;
}
function findPlaceholderRegistration(rows) {
    for (const row of rows) {
        if (!row)
            continue;
        if (isPlaceholderDeviceId(row.device_id))
            return row;
    }
    return null;
}
function deviceIdsMatch(left, right) {
    if (isPlaceholderDeviceId(left) || isPlaceholderDeviceId(right))
        return false;
    const a = normalizeDeviceId(left);
    const b = normalizeDeviceId(right);
    if (!a || !b)
        return false;
    if (a === b)
        return true;
    // App historically stored either the full hardware ID or a short suffix.
    if (a.length >= 6 && b.length >= 6) {
        return a.endsWith(b) || b.endsWith(a);
    }
    return false;
}
function emptyEmailDeviceResolution() {
    return { exists: false, sameDevice: false, tenantId: null, userId: null, registeredDevices: [] };
}
function uniqueDeviceIds(rows) {
    const seen = new Set();
    const out = [];
    for (const row of rows) {
        const raw = String(row?.device_id || '').trim();
        if (!raw || isPlaceholderDeviceId(raw))
            continue;
        const key = normalizeDeviceId(raw) || raw.toUpperCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(raw);
    }
    return out;
}
//# sourceMappingURL=device-identity.js.map