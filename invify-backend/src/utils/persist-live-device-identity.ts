import { supabaseAdmin } from '../db/supabase';
import { claimUnassignedDeviceForTenant } from './claim-unassigned-device';
import { isUsableDeviceId, normalizeDeviceId } from './device-identity';

export async function persistLiveDeviceIdentity(opts: {
  tenantId: string;
  deviceId?: string | null;
  location?: string | null;
}): Promise<{ claimed: boolean; locationUpdated: boolean; deviceId: string | null }> {
  const tenantId = String(opts.tenantId || '').trim();
  const location = String(opts.location || '').trim() || null;
  const deviceId = isUsableDeviceId(opts.deviceId) ? normalizeDeviceId(opts.deviceId) : null;
  if (!tenantId) return { claimed: false, locationUpdated: false, deviceId: null };

  let claimed = false;
  if (deviceId) {
    const result = await claimUnassignedDeviceForTenant({
      tenantId,
      deviceId,
      location,
    });
    claimed = result.bound;
  }

  if (location) {
    await supabaseAdmin.from('tenants').update({ location }).eq('id', tenantId);
    let query = supabaseAdmin
      .from('device_registrations')
      .update({ location })
      .eq('tenant_id', tenantId);
    if (deviceId) query = query.eq('device_id', deviceId);
    const { error } = await query;
    if (error) {
      console.warn('[persistLiveDeviceIdentity] location update failed:', error.message);
    }
  }

  if (claimed || location) {
    console.log(
      `[persistLiveDeviceIdentity] tenant=${tenantId} device=${deviceId || 'n/a'} claimed=${claimed} location=${location ? 'yes' : 'no'}`,
    );
  }

  return { claimed, locationUpdated: !!location, deviceId };
}
