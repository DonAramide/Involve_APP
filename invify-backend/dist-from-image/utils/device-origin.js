"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORIGIN_CUSTOMER = exports.ORIGIN_INVIFY = void 0;
exports.parseDeviceInfo = parseDeviceInfo;
exports.originOfDevice = originOfDevice;
exports.mergeDeviceInfo = mergeDeviceInfo;
exports.ORIGIN_INVIFY = 'INVIFY_UPLOAD';
exports.ORIGIN_CUSTOMER = 'CUSTOMER_INCOMING';
function parseDeviceInfo(raw) {
    if (!raw)
        return {};
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        }
        catch {
            return {};
        }
    }
    return typeof raw === 'object' ? { ...raw } : {};
}
function taggedOrigin(info) {
    return String(info.origin || info.source || '').trim().toUpperCase();
}
function originOfDevice(row) {
    const info = parseDeviceInfo(row?.device_info);
    const tagged = taggedOrigin(info);
    if (tagged === 'INVIFY_UPLOAD' || tagged === 'INVIFY_UPLOADED')
        return 'INVIFY_UPLOADED';
    if (tagged === 'CUSTOMER_INCOMING')
        return 'CUSTOMER_INCOMING';
    if (String(row?.device_category || '').toUpperCase() === 'COMPANY_DEVICE')
        return 'INVIFY_UPLOADED';
    if (!row?.tenant_id)
        return 'INVIFY_UPLOADED';
    return 'CUSTOMER_INCOMING';
}
function mergeDeviceInfo(existing, incoming, origin) {
    return {
        ...parseDeviceInfo(existing),
        ...parseDeviceInfo(incoming),
        origin,
        source: origin,
    };
}
//# sourceMappingURL=device-origin.js.map