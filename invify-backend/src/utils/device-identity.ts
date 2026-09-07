export type EmailDeviceResolution = {
  exists: boolean;
  sameDevice: boolean;
  tenantId: string | null;
  userId: string | null;
};

export function normalizeDeviceId(id?: string | null): string {
  return String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function deviceIdsMatch(left?: string | null, right?: string | null): boolean {
  const a = normalizeDeviceId(left);
  const b = normalizeDeviceId(right);
  if (!a || !b || a === 'UNKNOWN' || b === 'UNKNOWN') return false;
  if (a === b) return true;
  // App historically stored either the full hardware ID or a short suffix.
  if (a.length >= 6 && b.length >= 6) {
    return a.endsWith(b) || b.endsWith(a);
  }
  return false;
}

export function emptyEmailDeviceResolution(): EmailDeviceResolution {
  return { exists: false, sameDevice: false, tenantId: null, userId: null };
}
