import { supabaseAdmin } from '../db/supabase';
import {
  DeviceRegistrationRow,
  deviceIdsMatch,
  findPlaceholderRegistration,
  isUsableDeviceId,
  normalizeDeviceId,
} from './device-identity';

export type ClaimUnassignedResult = {
  bound: boolean;
  overrodeUnassigned: boolean;
  deviceNumber: number;
};

function emptyClaim(): ClaimUnassignedResult {
  return { bound: false, overrodeUnassigned: false, deviceNumber: 1 };
}

async function upsertFleetDevice(tenantId: string, deviceId: string, ownerName?: string | null) {
  const { error } = await supabaseAdmin.from('devices').upsert({
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
export async function claimUnassignedDeviceForTenant(opts: {
  tenantId: string;
  deviceId: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
  agentCode?: string | null;
  location?: string | null;
}): Promise<ClaimUnassignedResult> {
  const tenantId = String(opts.tenantId || '').trim();
  const claimedId = normalizeDeviceId(opts.deviceId);
  if (!tenantId || !isUsableDeviceId(claimedId)) return emptyClaim();

  const { data: rows, error: listErr } = await supabaseAdmin
    .from('device_registrations')
    .select('id, device_id, device_number, tenant_id, owner_email')
    .eq('tenant_id', tenantId);

  if (listErr) {
    console.warn('[claimUnassignedDevice] list failed:', listErr.message);
    return emptyClaim();
  }

  const registrations: DeviceRegistrationRow[] = rows || [];
  const alreadyHere = registrations.find((row) => deviceIdsMatch(row.device_id, claimedId));
  if (alreadyHere) {
    return {
      bound: true,
      overrodeUnassigned: false,
      deviceNumber: alreadyHere.device_number || 1,
    };
  }

  const usable = registrations.filter((row) => isUsableDeviceId(row.device_id));
  if (usable.length > 0) {
    return emptyClaim();
  }

  const { data: serialOwner } = await supabaseAdmin
    .from('device_registrations')
    .select('tenant_id, device_id')
    .eq('device_id', claimedId)
    .maybeSingle();

  if (serialOwner?.tenant_id && serialOwner.tenant_id !== tenantId) {
    console.warn(
      `[claimUnassignedDevice] ${claimedId} already belongs to tenant ${serialOwner.tenant_id}; not overriding ${tenantId}.`,
    );
    return emptyClaim();
  }

  const placeholder = findPlaceholderRegistration(registrations);
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
    const { error: updErr } = await supabaseAdmin
      .from('device_registrations')
      .update(patch)
      .eq('id', placeholder.id);
    if (updErr) {
      console.warn('[claimUnassignedDevice] placeholder update failed:', updErr.message);
      return emptyClaim();
    }
  } else {
    const { error: insErr } = await supabaseAdmin.from('device_registrations').insert({
      ...patch,
      device_number: 1,
    });
    if (insErr && !String(insErr.message || '').toLowerCase().includes('duplicate')) {
      console.warn('[claimUnassignedDevice] insert failed:', insErr.message);
      return emptyClaim();
    }
  }

  await supabaseAdmin.from('tenants').update({ device_count: 1 }).eq('id', tenantId);
  await upsertFleetDevice(tenantId, claimedId, opts.ownerName);

  console.log(`[claimUnassignedDevice] Bound ${claimedId} onto UNASSIGNED tenant ${tenantId}.`);
  return { bound: true, overrodeUnassigned: true, deviceNumber: 1 };
}
