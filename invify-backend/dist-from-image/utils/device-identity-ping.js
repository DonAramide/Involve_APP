"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildIdentityPingPayload = buildIdentityPingPayload;
exports.emitIdentityPing = emitIdentityPing;
const crypto_1 = require("crypto");
function buildIdentityPingPayload(tenantId) {
    return {
        requestId: (0, crypto_1.randomUUID)(),
        tenantId: tenantId || null,
        ts: new Date().toISOString(),
    };
}
async function emitIdentityPing(io, tenantId) {
    const room = `tenant:${tenantId}`;
    const payload = buildIdentityPingPayload(tenantId);
    const sockets = await io.in(room).fetchSockets();
    io.to(room).emit('device_identity_ping', payload);
    return { onlineSockets: sockets.length, requestId: payload.requestId, room };
}
//# sourceMappingURL=device-identity-ping.js.map