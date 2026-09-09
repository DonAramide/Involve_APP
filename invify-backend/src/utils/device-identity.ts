export type EmailDeviceResolution = {
  exists: boolean;
  sameDevice: boolean;
  tenantId: string | null;
  userId: string | null;
  registeredDevices: string[];
};

const UNUSABLE_DEVICE_IDS = new Set([
  'UNKNOWN',
  'NULL',
  'NONE',
  '0',
  'M1AJQ',
  'WEBCLIENT',
  'IOSDEVICE',
  'MACOSDEVICE',
]);

export function normalizeDeviceId(id?: string | null): string {
  return String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function isUsableDeviceId(id?: string | null): boolean {
  const clean = normalizeDeviceId(id);
  if (clean.length < 4) return false;
  return !UNUSABLE_DEVICE_IDS.has(clean);
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
  return { exists: false, sameDevice: false, tenantId: null, userId: null, registeredDevices: [] };
}

export function uniqueDeviceIds(rows: Array<{ device_id?: string | null } | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const raw = String(row?.device_id || '').trim();
    if (!raw) continue;
    const key = normalizeDeviceId(raw) || raw.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}
