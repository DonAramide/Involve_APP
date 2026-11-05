"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncController = void 0;
const sync_service_1 = require("../services/sync.service");
const device_trust_service_1 = require("../services/device-trust.service");
class SyncController {
    static async handleSync(req, res) {
        try {
            const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
            const deviceId = String(req.headers['x-device-id'] || '').trim();
            const correlationId = req.correlationId || req.headers['x-correlation-id'];
            if (!tenantId) {
                return res.status(401).json({ success: false, message: 'Tenant ID required for sync' });
            }
            // Authenticated tenant JWTs must still sync when the tablet omits
            // X-Device-ID (current production APKs). Enforce trust only when a
            // device id is present so mismatched devices stay blocked.
            if (deviceId) {
                try {
                    await device_trust_service_1.DeviceTrustService.verifyDeviceOrThrow(deviceId, String(tenantId));
                }
                catch (trustError) {
                    return res.status(403).json({ success: false, message: `Device Trust Failed: ${trustError.message}` });
                }
            }
            else {
                console.warn(`[SyncController] Allowing outbox without X-Device-ID for tenant ${tenantId}`);
            }
            const { events } = req.body;
            if (!events || !Array.isArray(events)) {
                return res.status(400).json({ success: false, message: 'Invalid payload: events array missing' });
            }
            const result = await sync_service_1.SyncService.processBatch(events, { tenantId, deviceId, correlationId });
            // If everything failed, we could return 207 or 500 depending on the design.
            // Returning 207 Multi-Status provides granular details back to the worker.
            return res.status(207).json(result);
        }
        catch (err) {
            console.error(`[SyncController] Fatal sync error: ${err.message}`);
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}
exports.SyncController = SyncController;
//# sourceMappingURL=sync.controller.js.map