import { requireAdminMfa, requireCheckerMfa } from '../src/middleware/require-admin-mfa.middleware';
import { authenticator } from 'otplib';

jest.mock('../src/db/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

const { supabaseAdmin } = require('../src/db/supabase');

function mockUser(row: any) {
  supabaseAdmin.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: row, error: row ? null : { message: 'missing' } }),
        single: async () => ({ data: row, error: row ? null : { message: 'missing' } }),
      }),
      ilike: () => ({
        maybeSingle: async () => ({ data: row, error: row ? null : { message: 'missing' } }),
      }),
    }),
  });
}

async function run(mw: typeof requireAdminMfa, req: any) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  let nextCalled = false;
  await mw(req, res, (() => {
    nextCalled = true;
  }) as any);
  return { res, next: nextCalled };
}

describe('requireCheckerMfa', () => {
  const secret = authenticator.generateSecret();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is the same step-up gate as requireAdminMfa', () => {
    expect(requireCheckerMfa).toBe(requireAdminMfa);
  });

  it('rejects checker actions without a 2FA code', async () => {
    mockUser({ mfa_enabled: true, mfa_secret: secret, email: 'checker@invify.app' });
    const { res, next } = await run(requireCheckerMfa, { user: { id: 'c1' }, body: {}, headers: {} });
    expect(next).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('MFA_REQUIRED');
  });

  it('rejects when the checker has not enabled 2FA', async () => {
    mockUser({ mfa_enabled: false, mfa_secret: null, email: 'checker@invify.app' });
    const { res } = await run(requireCheckerMfa, {
      user: { id: 'c1' },
      body: { otp: '123456' },
      headers: {},
    });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('MFA_NOT_ENABLED');
  });

  it('accepts a valid authenticator code', async () => {
    mockUser({ mfa_enabled: true, mfa_secret: secret, email: 'checker@invify.app' });
    const otp = authenticator.generate(secret);
    const { res, next } = await run(requireCheckerMfa, {
      user: { id: 'c1' },
      body: { totpCode: otp },
      headers: {},
    });
    expect(next).toBe(true);
    expect(res.body).toBeNull();
  });

  it('accepts mfaToken with spaces', async () => {
    mockUser({ mfa_enabled: true, mfa_secret: secret, email: 'checker@invify.app' });
    const otp = authenticator.generate(secret);
    const { next } = await run(requireCheckerMfa, {
      user: { id: 'c1' },
      body: { mfaToken: `${otp.slice(0, 3)} ${otp.slice(3)}` },
      headers: {},
    });
    expect(next).toBe(true);
  });

  it('rejects a wrong authenticator code', async () => {
    mockUser({ mfa_enabled: true, mfa_secret: secret, email: 'checker@invify.app' });
    const { res, next } = await run(requireCheckerMfa, {
      user: { id: 'c1' },
      body: { mfaToken: '000000' },
      headers: {},
    });
    expect(next).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('INVALID_MFA');
  });
});
