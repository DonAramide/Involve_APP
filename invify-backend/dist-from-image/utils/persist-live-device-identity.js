"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistLiveDeviceIdentity = persistLiveDeviceIdentity;
const supabase_1 = require("../db/supabase");
const claim_unassigned_device_1 = require("./claim-unassigned-device");
const device_identity_1 = require("./device-identity");
async function persistLiveDeviceIdentity(opts) {
    const tenantId = String(opts.tenantId || '').trim();
    const location = String(opts.location || '').trim() || null;
    const deviceId = (0, device_identity_1.isUsableDeviceId)(opts.deviceId) ? (0, device_identity_1.normalizeDeviceId)(opts.deviceId) : null;
    if (!tenantId)
        return { claimed: false, locationUpdated: false, deviceId: null };
    let claimed = false;
    if (deviceId) {
        const result = await (0, claim_unassigned_device_1.claimUnassignedDeviceForTenant)({
            tenantId,
            deviceId,
            location,
        });
        claimed = result.bound;
    }
    if (location) {
        await supabase_1.supabaseAdmin.from('tenants').update({ location }).eq('id', tenantId);
        let query = supabase_1.supabaseAdmin
            .from('device_registrations')
            .update({ location })
            .eq('tenant_id', tenantId);
        if (deviceId)
            query = query.eq('device_id', deviceId);
        const { error } = await query;
        if (error) {
            console.warn('[persistLiveDeviceIdentity] location update failed:', error.message);
        }
    }
    if (claimed || location) {
        console.log(`[persistLiveDeviceIdentity] tenant=${tenantId} device=${deviceId || 'n/a'} claimed=${claimed} location=${location ? 'yes' : 'no'}`);
    }
    return { claimed, locationUpdated: !!location, deviceId };
}
//# sourceMappingURL=persist-live-device-identity.js.map