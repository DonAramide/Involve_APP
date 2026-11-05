"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_NIBSS_PORT = exports.DEFAULT_NIBSS_IP = void 0;
exports.nonEmptyHostValue = nonEmptyHostValue;
exports.hostCodeOf = hostCodeOf;
exports.pickHostIp = pickHostIp;
exports.pickHostPort = pickHostPort;
exports.resolvePosHosts = resolvePosHosts;
/** NIBSS production switch (ISO 8583). Admin host drawer uses these as empty-IP defaults. */
exports.DEFAULT_NIBSS_IP = '196.6.103.18';
exports.DEFAULT_NIBSS_PORT = 5001;
function nonEmptyHostValue(raw) {
    if (raw == null)
        return null;
    const s = String(raw).trim();
    if (!s || s === '—' || s.toLowerCase() === 'null')
        return null;
    return s;
}
function hostCodeOf(host) {
    return String(host?.hostCode || '').toLowerCase();
}
function pickHostIp(host) {
    if (!host || typeof host !== 'object')
        return null;
    for (const key of ['ip', 'ipAddress', 'hostIp', 'hostname', 'host']) {
        const v = nonEmptyHostValue(host[key]);
        if (v)
            return v;
    }
    return null;
}
function pickHostPort(host) {
    if (!host || typeof host !== 'object')
        return null;
    const s = nonEmptyHostValue(host.port ?? host.portNumber);
    if (!s)
        return null;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
}
/**
 * Build the host payload for terminal sync.
 * Looks up the configured activeHost in ALL hosts (not only isActive),
 * so NIBSS IP/port still sync when the NIBSS row is selected but not flagged active.
 * Empty NIBSS IP/port (admin drawer shows defaults without Save) use production switch defaults.
 */
function resolvePosHosts(routingConfig) {
    const allHosts = routingConfig?.hosts || [];
    const activeHosts = allHosts
        .filter((h) => h.isActive)
        .sort((a, b) => (a.priority || 99) - (b.priority || 99));
    const activeCode = String(routingConfig?.activeHost || '').toLowerCase();
    const nibssHost = allHosts.find((h) => hostCodeOf(h) === 'nibss') || null;
    const expressPay = allHosts.find((h) => hostCodeOf(h) === 'express_pay') ||
        activeHosts.find((h) => hostCodeOf(h) === 'express_pay');
    const kimono = allHosts.find((h) => hostCodeOf(h) === 'kimono') ||
        activeHosts.find((h) => hostCodeOf(h) === 'kimono');
    let primaryHost = allHosts.find((h) => hostCodeOf(h) === activeCode) ||
        activeHosts[0] ||
        null;
    const nibssSelected = activeCode === 'nibss' || hostCodeOf(primaryHost) === 'nibss';
    let nibssIp = pickHostIp(nibssHost) || (hostCodeOf(primaryHost) === 'nibss' ? pickHostIp(primaryHost) : null);
    let nibssPort = pickHostPort(nibssHost) || (hostCodeOf(primaryHost) === 'nibss' ? pickHostPort(primaryHost) : null);
    if (nibssSelected) {
        if (!nibssIp)
            nibssIp = exports.DEFAULT_NIBSS_IP;
        if (nibssPort == null)
            nibssPort = exports.DEFAULT_NIBSS_PORT;
    }
    if (nibssSelected) {
        primaryHost = {
            ...(nibssHost || primaryHost || {}),
            hostCode: (nibssHost || primaryHost)?.hostCode || 'nibss',
            hostName: (nibssHost || primaryHost)?.hostName || 'NIBSS',
            ip: nibssIp,
            port: nibssPort,
            sslEnabled: (nibssHost || primaryHost)?.sslEnabled ?? true,
        };
    }
    const secondaryHost = activeHosts.find((h) => h !== primaryHost && hostCodeOf(h) !== hostCodeOf(primaryHost)) || null;
    const tertiaryHost = activeHosts.find((h) => h !== primaryHost &&
        h !== secondaryHost &&
        hostCodeOf(h) !== hostCodeOf(primaryHost) &&
        hostCodeOf(h) !== hostCodeOf(secondaryHost)) || null;
    return {
        allHosts,
        activeHosts,
        activeCode,
        primaryHost,
        secondaryHost,
        tertiaryHost,
        expressPay,
        kimono,
        nibssEndpoint: {
            nibssIp: nibssIp || null,
            nibssPort: nibssPort ?? null,
            nibssSsl: !!((nibssHost || primaryHost)?.sslEnabled ?? nibssSelected),
        },
    };
}
//# sourceMappingURL=pos-host-endpoint.js.map