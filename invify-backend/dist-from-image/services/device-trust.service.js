"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceTrustService = void 0;
const supabase_1 = require("../db/supabase");
class DeviceTrustService {
    static async verifyDeviceOrThrow(deviceId, tenantId) {
        if (!deviceId)
            throw new Error('MISSING_DEVICE_ID');
        const { data: device, error } = await supabase_1.supabase
            .from('devices')
            .select('device_id, tenant_id, device_category, is_active, status, activation_code, license:tenants(status, plan)')
            .eq('device_id', deviceId)
            .maybeSingle();
        if (error) {
            throw new Error(`DEVICE_LOOKUP_FAILED: ${error.message}`);
        }
        if (!device) {
            // Allow fallback to user_devices if device isn't a terminal
            const { data: userDevice } = await supabase_1.supabase
                .from('user_devices')
                .select('device_id, status')
                .eq('device_id', deviceId)
                .maybeSingle();
            if (!userDevice)
                throw new Error('DEVICE_NOT_FOUND');
            if (userDevice.status === 'blocked')
                throw new Error('DEVICE_REVOKED');
            if (userDevice.status === 'pending')
                throw new Error('DEVICE_SUSPENDED');
            return true;
        }
        if (device.tenant_id !== tenantId) {
            throw new Error('DEVICE_TENANT_MISMATCH');
        }
        // Verify activation and status
        if (device.is_active === false) {
            throw new Error('DEVICE_INACTIVE');
        }
        if (device.status === 'revoked') {
            throw new Error('DEVICE_REVOKED');
        }
        if (device.status === 'suspended') {
            throw new Error('DEVICE_SUSPENDED');
        }
        // Verify license/tenant status
        const tenant = device.license;
        if (tenant && tenant.status && tenant.status !== 'active') {
            throw new Error('TENANT_LICENSE_INVALID');
        }
        return true;
    }
}
exports.DeviceTrustService = DeviceTrustService;
//# sourceMappingURL=device-trust.service.js.map