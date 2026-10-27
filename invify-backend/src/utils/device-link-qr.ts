import crypto from 'crypto';
import { supabaseAdmin } from '../db/supabase';

export const DEVICE_LINK_TTL_MS = 3 * 60 * 1000;
export const WEB_ISSUER_DEVICE_ID = 'WEB-PORTAL';

export function createDeviceLinkToken(now = Date.now()) {
  return {
    token: crypto.randomBytes(16).toString('hex'),
    expiresAt: new Date(now + DEVICE_LINK_TTL_MS),
  };
}

export function buildDeviceLinkQrPayload(input: {
  token: string;
  tenantId: string;
  businessName: string;
  industry: string | null | undefined;
  expiresAt: Date | string;
}): string {
  const expiresAt =
    typeof input.expiresAt === 'string' ? input.expiresAt : input.expiresAt.toISOString();
  return JSON.stringify({
    action: 'LINK_DEVICE',
    token: input.token,
    tenantId: input.tenantId,
    businessName: input.businessName,
    industry: input.industry || null,
    expiresAt,
  });
}

export async function issueDeviceLinkQr(opts: {
  tenantId: string;
  issuerDeviceId?: string | null;
  agentCode?: string;
}): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number; error: string }
> {
  const tenantId = String(opts.tenantId || '').trim();
  if (!tenantId) {
    return { ok: false, status: 400, error: 'tenantId is required' };
  }

  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('id, name, type, phone, plan')
    .eq('id', tenantId)
    .single();

  if (tenantErr || !tenant) {
    return { ok: false, status: 404, error: 'Tenant not found' };
  }

  const { token, expiresAt } = createDeviceLinkToken();
  const expiresAtIso = expiresAt.toISOString();

  try {
    await supabaseAdmin.from('device_link_tokens').insert({
      token,
      tenant_id: tenantId,
      issuer_device_id: opts.issuerDeviceId || null,
      issuer_agent_code: opts.agentCode || 'AAA000',
      expires_at: expiresAtIso,
      used: false,
    });
  } catch (storeErr: any) {
    console.warn('[issueDeviceLinkQr] device_link_tokens insert failed:', storeErr.message);
  }

  const qrPayload = buildDeviceLinkQrPayload({
    token,
    tenantId: tenant.id,
    businessName: tenant.name,
    industry: tenant.type,
    expiresAt: expiresAtIso,
  });

  return {
    ok: true,
    data: {
      token,
      expiresAt: expiresAtIso,
      qrPayload,
      tenant: { id: tenant.id, name: tenant.name, type: tenant.type, plan: tenant.plan },
    },
  };
}
