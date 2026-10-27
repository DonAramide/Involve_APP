/**
 * Fail-closed virtual-account ownership.
 * Only an explicit school or staff account may credit USER_WALLET.
 * This module does not write the ledger.
 */

export type VirtualAccountKind = 'school' | 'staff' | 'parent' | 'unknown';

export function normalizeAccountDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function payloadHoldsAccount(payload: Record<string, unknown> | null | undefined, va: string): boolean {
  const want = normalizeAccountDigits(va);
  if (want.length < 8 || !payload) return false;
  const keys = [
    'virtualAccountNumber',
    'accountNumber',
    'account_number',
    'virtual_account_number',
  ];
  return keys.some((key) => normalizeAccountDigits(payload[key]) === want);
}

export function creditsSchoolWallet(kind: VirtualAccountKind): boolean {
  return kind === 'school' || kind === 'staff';
}

export function classifyVirtualAccount(opts: {
  va: string;
  tenantVirtualAccount?: string | null;
  staffVirtualAccount?: string | null;
  schoolEntityTypes?: string[];
  parentRegistered?: boolean;
  parentCustomer?: boolean;
}): VirtualAccountKind {
  const va = normalizeAccountDigits(opts.va);
  if (va.length < 8) return 'unknown';
  if (opts.parentRegistered || opts.parentCustomer) return 'parent';
  if (opts.schoolEntityTypes?.some((type) => type === 'parent' || type === 'parent_virtual_account')) {
    return 'parent';
  }
  if (normalizeAccountDigits(opts.tenantVirtualAccount) === va) return 'school';
  if (opts.schoolEntityTypes?.includes('quasar_virtual_account')) return 'school';
  if (normalizeAccountDigits(opts.staffVirtualAccount) === va) return 'staff';
  return 'unknown';
}

/** Postgres uuid::text form used by allocate_parent_credit lock and key prefix. */
export function canonicalTenantId(tenantId: string): string {
  return String(tenantId || '').trim().toLowerCase();
}

/** New parent-wallet bills only. Never used to backfill historical USER_WALLET rows. */
export function newParentAllocationIdempotencyKey(tenantId: string, identity: string): string {
  return `alloc:${canonicalTenantId(tenantId)}:${identity}`;
}

export function isParentWalletPaymentMethod(method: unknown): boolean {
  const value = String(method || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  return value === 'parent_credit' ||
    value.includes('parent_credit') ||
    value === 'parent_wallet' ||
    value.includes('parent_wallet');
}

/** School parent-credit bills, including Preview "Wallet" when a student is on the invoice. */
export function isSchoolParentWalletPayment(method: unknown, payload?: Record<string, unknown> | null): boolean {
  if (isParentWalletPaymentMethod(method)) return true;
  const value = String(method || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  if (value !== 'wallet' && value !== 'parent_wallet') return false;
  const mode = String(payload?.businessMode || payload?.business_mode || '').toLowerCase();
  if (mode === 'school') return true;
  return Boolean(payload?.studentId || payload?.student_id);
}

export async function loadVirtualAccountKind(
  va: string,
  opts?: { tenantId?: string | null },
): Promise<{ kind: VirtualAccountKind; tenantId: string | null }> {
  const { supabaseAdmin } = await import('../db/supabase');
  const { isParentCustomerId } = await import('../utils/parent-va-routing');
  const raw = String(va || '').trim();
  const digits = normalizeAccountDigits(raw);
  if (digits.length < 8) return { kind: 'unknown', tenantId: opts?.tenantId || null };

  const tenantScope = opts?.tenantId || null;
  const entityQuery = supabaseAdmin
    .from('school_entities')
    .select('tenant_id, entity_type, payload')
    .in('entity_type', ['parent', 'parent_virtual_account', 'quasar_virtual_account'])
    .limit(40);
  const { data: entities } = tenantScope
    ? await entityQuery.eq('tenant_id', tenantScope)
    : await entityQuery;

  const matches = (entities || []).filter((row: any) => payloadHoldsAccount(row.payload, raw));
  const parentHit = matches.find((row: any) => row.entity_type === 'parent' || row.entity_type === 'parent_virtual_account');
  if (parentHit) return { kind: 'parent', tenantId: parentHit.tenant_id || tenantScope };

  const schoolHit = matches.find((row: any) => row.entity_type === 'quasar_virtual_account');
  const { data: tenantRows } = await supabaseAdmin
    .from('tenants')
    .select('id, virtual_account_number')
    .eq('virtual_account_number', raw)
    .limit(5);
  const tenantRow =
    (tenantRows || []).find((row: any) => !tenantScope || row.id === tenantScope) || (tenantRows || [])[0] || null;
  const { data: staffRow } = await supabaseAdmin
    .from('users')
    .select('tenant_id, virtual_account_number')
    .eq('virtual_account_number', raw)
    .maybeSingle();
  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, tenant_id')
    .eq('virtual_account_number', raw)
    .limit(20);

  const parentCustomer = (customers || []).some((row: any) => isParentCustomerId(row.id));
  const kind = classifyVirtualAccount({
    va: raw,
    tenantVirtualAccount: tenantRow?.virtual_account_number,
    staffVirtualAccount: staffRow?.virtual_account_number,
    schoolEntityTypes: matches.map((row: any) => String(row.entity_type)),
    parentRegistered: Boolean(parentHit),
    parentCustomer,
  });
  const tenantId =
    (kind === 'school' && (schoolHit?.tenant_id || tenantRow?.id)) ||
    (kind === 'staff' && staffRow?.tenant_id) ||
    (kind === 'parent' && ((customers || []).find((row: any) => isParentCustomerId(row.id))?.tenant_id || tenantScope)) ||
    tenantScope ||
    null;
  return { kind, tenantId };
}
