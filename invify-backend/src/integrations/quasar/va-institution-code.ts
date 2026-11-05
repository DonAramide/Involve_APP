/**
 * Resolve the canonical institution_code for Quasar VA provider routing.
 * Uses Invify institution registry (VIRTUAL_ACCOUNTS relationship) only —
 * never tenant UUID, institution UUID, or wallet owner id.
 *
 * Also exports the VA counterparty (Quasar merchantWalletOwnerId / schoolId)
 * resolver: the Invify tenant UUID already used by working student/customer paths.
 */
import { supabaseAdmin } from '../../db/supabase';

const VA_SERVICE = 'VIRTUAL_ACCOUNTS';

/** Quasar CreateVirtualAccountDto requires UUID v4 for merchantWalletOwnerId / schoolId. */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FORBIDDEN_COUNTERPARTY_SENTINELS = new Set([
  'platform-admin-owner-id',
]);

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

/**
 * Quasar VA split counterparty / school wallet owner.
 * Must be the target Invify tenant UUID (same convention as student/customer VA).
 * Never a fabricated platform id, institution UUID substitute, or random UUID.
 */
export function resolveVaCounterpartyOwnerId(tenantId: string): string {
  const tid = String(tenantId || '').trim();
  if (!tid) {
    throw new Error('VA_COUNTERPARTY_TENANT_ID_REQUIRED');
  }
  if (FORBIDDEN_COUNTERPARTY_SENTINELS.has(tid.toLowerCase())) {
    throw new Error('VA_COUNTERPARTY_SENTINEL_FORBIDDEN');
  }
  if (!UUID_V4.test(tid)) {
    throw new Error('VA_COUNTERPARTY_TENANT_ID_INVALID');
  }
  return tid;
}
