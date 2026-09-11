export type VerificationLogRow = {
  id: string;
  tenantId: string | null;
  email: string | null;
  phone: string | null;
  recipient: string;
  channel: string;
  purpose: string;
  status: string;
  displayStatus: string;
  attemptCount: number;
  expiresAt: string | null;
  verifiedAt: string | null;
  createdAt: string | null;
  otp: string | null;
};

const LOG_COLUMNS =
  'id, tenant_id, email, phone, channel, purpose, status, attempt_count, expires_at, verified_at, created_at, plain_code, code';

const LOG_COLUMNS_WITHOUT_PLAIN =
  'id, tenant_id, email, phone, channel, purpose, status, attempt_count, expires_at, verified_at, created_at, code';

export function verificationLogSelect(includePlainCode = true): string {
  return includePlainCode ? LOG_COLUMNS : LOG_COLUMNS_WITHOUT_PLAIN;
}

/** Only a 6-digit OTP. Never return a bcrypt hash. */
export function extractSupportOtp(row: any): string | null {
  const candidates = [row?.plain_code, row?.otp, row?.code];
  for (const raw of candidates) {
    const value = String(raw || '').trim();
    if (/^\d{6}$/.test(value)) return value;
  }
  return null;
}

export function sanitizeVerificationSearch(raw: unknown): string {
  return String(raw || '')
    .trim()
    .slice(0, 120)
    .replace(/[^a-zA-Z0-9@.+ \-]/g, '');
}

export function toVerificationLogRow(row: any, now = Date.now()): VerificationLogRow {
  const rawStatus = String(row?.status || '').toUpperCase();
  const expiresAtMs = row?.expires_at ? new Date(row.expires_at).getTime() : 0;
  const displayStatus =
    rawStatus === 'PENDING' && expiresAtMs > 0 && expiresAtMs < now ? 'EXPIRED' : rawStatus;

  return {
    id: String(row?.id || ''),
    tenantId: row?.tenant_id || null,
    email: row?.email || null,
    phone: row?.phone || null,
    recipient: row?.email || row?.phone || '—',
    channel: String(row?.channel || ''),
    purpose: String(row?.purpose || ''),
    status: rawStatus,
    displayStatus,
    attemptCount: Number(row?.attempt_count || 0),
    expiresAt: row?.expires_at || null,
    verifiedAt: row?.verified_at || null,
    createdAt: row?.created_at || null,
    otp: extractSupportOtp(row),
  };
}

export function uniqueLatestByRecipient(rows: VerificationLogRow[]): VerificationLogRow[] {
  const seen = new Set<string>();
  const out: VerificationLogRow[] = [];
  for (const row of rows) {
    const key = String(row.email || row.phone || row.id).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}
