"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimUnassignedDeviceForTenant = claimUnassignedDeviceForTenant;
const supabase_1 = require("../db/supabase");
const device_identity_1 = require("./device-identity");
function emptyClaim() {
    return { bound: false, overrodeUnassigned: false, deviceNumber: 1 };
}
async function upsertFleetDevice(tenantId, deviceId, ownerName) {
    const { error } = await supabase_1.supabaseAdmin.from('devices').upsert({
        device_id: deviceId,
        tenant_id: tenantId,
        status: 'ACTIVE',
        is_active: true,
        platform: 'android',
        device_name: ownerName || deviceId,
        last_seen: new Date().toISOString(),
    }, { onConflict: 'device_id' });
    if (error) {
        console.warn('[claimUnassignedDevice] devices upsert failed (non-fatal):', error.message);
    }
}
/**
 * If a web-created tenant has no real hardware serial (null / UNASSIGNED /
 * WEB-PORTAL), bind the incoming tablet serial onto that slot.
 * Does not steal a tenant that already has a different usable device.
 */
async function claimUnassignedDeviceForTenant(opts) {
    const tenantId = String(opts.tenantId || '').trim();
    const claimedId = (0, device_identity_1.normalizeDeviceId)(opts.deviceId);
    if (!tenantId || !(0, device_identity_1.isUsableDeviceId)(claimedId))
        return emptyClaim();
    const { data: rows, error: listErr } = await supabase_1.supabaseAdmin
        .from('device_registrations')
        .select('id, device_id, device_number, tenant_id, owner_email')
        .eq('tenant_id', tenantId);
    if (listErr) {
        console.warn('[claimUnassignedDevice] list failed:', listErr.message);
        return emptyClaim();
    }
    const registrations = rows || [];
    const alreadyHere = registrations.find((row) => (0, device_identity_1.deviceIdsMatch)(row.device_id, claimedId));
    if (alreadyHere) {
        return {
            bound: true,
            overrodeUnassigned: false,
            deviceNumber: alreadyHere.device_number || 1,
        };
    }
    const usable = registrations.filter((row) => (0, device_identity_1.isUsableDeviceId)(row.device_id));
    if (usable.length > 0) {
        return emptyClaim();
    }
    const { data: serialOwner } = await supabase_1.supabaseAdmin
        .from('device_registrations')
        .select('tenant_id, device_id')
        .eq('device_id', claimedId)
        .maybeSingle();
    if (serialOwner?.tenant_id && serialOwner.tenant_id !== tenantId) {
        console.warn(`[claimUnassignedDevice] ${claimedId} already belongs to tenant ${serialOwner.tenant_id}; not overriding ${tenantId}.`);
        return emptyClaim();
    }
    const placeholder = (0, device_identity_1.findPlaceholderRegistration)(registrations);
    const patch = {
        device_id: claimedId,
        tenant_id: tenantId,
        owner_email: opts.ownerEmail || null,
        owner_name: opts.ownerName || null,
        agent_code: (opts.agentCode || 'AAA000').toUpperCase(),
        location: opts.location || null,
        status: 'active',
    };
    if (placeholder?.id) {
        const { error: updErr } = await supabase_1.supabaseAdmin
            .from('device_registrations')
            .update(patch)
            .eq('id', placeholder.id);
        if (updErr) {
            console.warn('[claimUnassignedDevice] placeholder update failed:', updErr.message);
            return emptyClaim();
        }
    }
    else {
        const { error: insErr } = await supabase_1.supabaseAdmin.from('device_registrations').insert({
            ...patch,
            device_number: 1,
        });
        if (insErr && !String(insErr.message || '').toLowerCase().includes('duplicate')) {
            console.warn('[claimUnassignedDevice] insert failed:', insErr.message);
            return emptyClaim();
        }
    }
    await supabase_1.supabaseAdmin.from('tenants').update({ device_count: 1 }).eq('id', tenantId);
    await upsertFleetDevice(tenantId, claimedId, opts.ownerName);
    console.log(`[claimUnassignedDevice] Bound ${claimedId} onto UNASSIGNED tenant ${tenantId}.`);
    return { bound: true, overrodeUnassigned: true, deviceNumber: 1 };
}
//# sourceMappingURL=claim-unassigned-device.js.map