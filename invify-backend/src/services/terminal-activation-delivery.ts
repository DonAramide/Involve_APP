import { supabaseAdmin } from '../db/supabase';
import { planNameFromIndex } from '../utils/paid-license';
import { emailService } from './email.service';
import { PDFService, TerminalActivationDocument } from './pdf.service';

export function resolveTenantActivationEmail(
  tenant: { owner_email?: string | null } | null | undefined,
  users: Array<{ email?: string | null; role?: string | null }> | null | undefined,
): string | null {
  const ownerEmail = String(tenant?.owner_email || '').trim();
  if (ownerEmail.includes('@')) return ownerEmail;
  const owner = (users || []).find((user) => {
    const role = String(user?.role || '').toLowerCase();
    const email = String(user?.email || '').trim();
    return role === 'owner' && email.includes('@');
  });
  return owner ? String(owner.email).trim() : null;
}

export async function deliverApprovedTerminalActivation(activation: {
  tenant_id: string;
  activation_code: string;
  duration_days?: number | null;
  plan_index?: number | null;
  device_suffix?: string | null;
  expires_at?: string | null;
}): Promise<{ sent: boolean; to: string | null; error?: string }> {
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('name, type, owner_email')
    .eq('id', activation.tenant_id)
    .maybeSingle();
  if (tenantErr) throw tenantErr;

  const { data: users, error: userErr } = await supabaseAdmin
    .from('users')
    .select('email, role')
    .eq('tenant_id', activation.tenant_id)
    .limit(50);
  if (userErr) throw userErr;

  const to = resolveTenantActivationEmail(tenant, users);
  if (!to) {
    return { sent: false, to: null, error: 'This tenant has no email address on file.' };
  }

  const expiry = activation.expires_at
    ? new Date(activation.expires_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';
  const document: TerminalActivationDocument = {
    businessName: tenant?.name || 'Tenant',
    mode: tenant?.type ? String(tenant.type) : '',
    plan: String(planNameFromIndex(activation.plan_index) || 'basic').toUpperCase(),
    durationDays: Number(activation.duration_days) || 0,
    expiry,
    activationCode: activation.activation_code,
    deviceSuffix: activation.device_suffix || '',
  };

  const pdf = await PDFService.generateTerminalActivationPDF(document);
  const sent = await emailService.sendTerminalActivationEmail(to, document, pdf);
  return {
    sent,
    to,
    error: sent ? undefined : 'The activation file could not be emailed.',
  };
}
