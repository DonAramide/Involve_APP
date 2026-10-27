/** Admin-editable tenant columns. Anything else in a PATCH body is dropped. */
export const TENANT_UPDATE_ALLOWED_KEYS = [
  'name',
  'type',
  'plan',
  'plan_expires_at',
  'status',
  'support_phone',
  'support_email',
  'support_whatsapp',
  'phone',
  'owner_email',
  'owner_name',
  'location',
  'country',
  'state',
  'lga',
  'street_address',
] as const;

export type TenantUpdateKey = (typeof TENANT_UPDATE_ALLOWED_KEYS)[number];

const ALLOWED = new Set<string>(TENANT_UPDATE_ALLOWED_KEYS);

/** Columns that may be missing on older staging DBs — strip and retry. */
export const TENANT_UPDATE_OPTIONAL_KEYS = ['plan_expires_at'] as const;

export function normalizeTenantType(type: unknown): string | undefined {
  if (type == null || type === '') return undefined;
  const normalized = String(type).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'service' || normalized === 'invify_services' || normalized === 'hospitality') {
    return 'services';
  }
  if (normalized === 'education' || normalized === 'invify_school') {
    return 'school';
  }
  if (normalized === 'invify_retail') {
    return 'retail';
  }
  return normalized;
}

function normalizeExpiry(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

/**
 * Strip computed list-row fields and unknown keys so PostgREST does not 500
 * on schema-cache misses (e.g. device_registrations, plan_expires_at).
 */
export function sanitizeTenantUpdates(body: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const input = body && typeof body === 'object' ? body : {};
  const updates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED.has(key)) continue;
    if (key === 'type') {
      const type = normalizeTenantType(value);
      if (type !== undefined) updates.type = type;
      continue;
    }
    if (key === 'plan_expires_at') {
      const expiry = normalizeExpiry(value);
      if (expiry !== undefined) updates.plan_expires_at = expiry;
      continue;
    }
    if (key === 'plan' || key === 'status' || key === 'name') {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) updates[key] = key === 'name' ? trimmed : trimmed.toLowerCase();
      }
      continue;
    }
    updates[key] = value === '' ? null : value;
  }

  return updates;
}

export function isMissingTenantColumnError(error: { message?: string; code?: string } | null | undefined, column: string): boolean {
  const msg = String(error?.message || '').toLowerCase();
  const col = column.toLowerCase();
  if (!msg.includes(col)) return false;
  return (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('could not find') ||
    error?.code === 'PGRST204'
  );
}

export function withoutOptionalTenantColumns(
  updates: Record<string, unknown>,
  error: { message?: string; code?: string } | null | undefined,
): Record<string, unknown> | null {
  const next = { ...updates };
  let stripped = false;
  for (const key of TENANT_UPDATE_OPTIONAL_KEYS) {
    if (key in next && isMissingTenantColumnError(error, key)) {
      delete next[key];
      stripped = true;
    }
  }
  return stripped ? next : null;
}
