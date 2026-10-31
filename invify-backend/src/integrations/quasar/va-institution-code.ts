/**
 * Resolve the canonical institution_code for Quasar VA provider routing.
 * Uses Invify institution registry (VIRTUAL_ACCOUNTS relationship) only —
 * never tenant UUID, institution UUID, or wallet owner id.
 */
import { supabaseAdmin } from '../../db/supabase';

const VA_SERVICE = 'VIRTUAL_ACCOUNTS';

function isMissingRelation(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

export function normalizeVaInstitutionCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) return null;
  return code;
}

/**
 * Canonical VA institution code for a tenant, or null when the tenant has no
 * active VIRTUAL_ACCOUNTS institution relationship (legacy Quasar default path).
 */
export async function resolveVaInstitutionCodeForTenant(
  tenantId: string,
): Promise<string | null> {
  const tid = String(tenantId || '').trim();
  if (!tid) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from('tenant_institution_relationships')
      .select(
        'status, service_type, institutions ( institution_code, status, deleted_at )',
      )
      .eq('tenant_id', tid)
      .eq('service_type', VA_SERVICE)
      .eq('status', 'ACTIVE')
      .limit(5);

    if (error) {
      if (isMissingRelation(error)) return null;
      console.warn(
        '[va-institution-code] relationship lookup failed:',
        error.message,
      );
      return null;
    }

    for (const row of data || []) {
      const inst = Array.isArray((row as any).institutions)
        ? (row as any).institutions[0]
        : (row as any).institutions;
      if (!inst || inst.deleted_at) continue;
      if (String(inst.status || '').toUpperCase() !== 'ACTIVE') continue;
      const code = normalizeVaInstitutionCode(inst.institution_code);
      if (code) return code;
    }
  } catch (err: any) {
    if (isMissingRelation(err)) return null;
    console.warn('[va-institution-code] unexpected error:', err?.message || err);
  }

  return null;
}

/** Adds the institution code using both field names Quasar accepts. Omits it when absent. */
export function applyInstitutionCodeToVaBody(
  body: Record<string, unknown>,
  institutionCode: string | null | undefined,
): void {
  const code = normalizeVaInstitutionCode(institutionCode);
  if (!code) return;
  body.institutionCode = code;
  body.institution_code = code;
}
