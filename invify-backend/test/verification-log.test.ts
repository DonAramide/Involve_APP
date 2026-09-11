import {
  extractSupportOtp,
  sanitizeVerificationSearch,
  toVerificationLogRow,
  uniqueLatestByRecipient,
  verificationLogSelect,
} from '../src/utils/verification-log';

describe('verification log', () => {
  test('select list includes support OTP columns but maps hashes out of the API row', () => {
    const cols = verificationLogSelect().split(',').map((c) => c.trim());
    expect(cols).toContain('plain_code');
    expect(cols).toContain('code');
  });

  test('exposes a 6-digit OTP and never a bcrypt hash', () => {
    const hash = '$2b$10$abcdefghijklmnopqrstuv';
    const row = toVerificationLogRow({
      id: 'a',
      email: 'aramyde@gmail.com',
      phone: null,
      code: hash,
      plain_code: '482913',
      channel: 'EMAIL',
      purpose: 'SIGNUP',
      status: 'PENDING',
      attempt_count: 1,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      verified_at: null,
      created_at: new Date().toISOString(),
    });
    expect(row.otp).toBe('482913');
    expect(JSON.stringify(row)).not.toContain(hash);
    expect(row).not.toHaveProperty('code');
    expect(row).not.toHaveProperty('plain_code');
  });

  test('recovers a legacy plaintext code stored in the hash column', () => {
    expect(extractSupportOtp({ code: '119204' })).toBe('119204');
    expect(extractSupportOtp({ code: '$2b$10$not-an-otp' })).toBeNull();
  });

  test('marks overdue pending rows as expired without mutating storage', () => {
    const row = toVerificationLogRow({
      id: 'b',
      email: 'x@y.com',
      status: 'PENDING',
      channel: 'EMAIL',
      purpose: 'SIGNUP',
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(row.status).toBe('PENDING');
    expect(row.displayStatus).toBe('EXPIRED');
    expect(row.otp).toBeNull();
  });

  test('keeps the newest row per email', () => {
    const rows = uniqueLatestByRecipient([
      toVerificationLogRow({ id: '1', email: 'a@b.com', status: 'PENDING', created_at: '2026-09-11T20:00:00Z' }),
      toVerificationLogRow({ id: '2', email: 'a@b.com', status: 'CANCELLED', created_at: '2026-09-11T19:00:00Z' }),
      toVerificationLogRow({ id: '3', email: 'c@d.com', phone: null, status: 'VERIFIED' }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(['1', '3']);
  });

  test('search sanitizer strips filter injection characters', () => {
    expect(sanitizeVerificationSearch('aramyde@gmail.com')).toBe('aramyde@gmail.com');
    expect(sanitizeVerificationSearch('a%,b_or(true)')).toBe('abortrue');
  });
});
