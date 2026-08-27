import fs from 'node:fs';
import path from 'node:path';
import { authenticator } from 'otplib';
import {
  consumeMfaChallenge,
  issueMfaChallenge,
  resetMfaChallengesForTests,
  validateMfaChallenge,
} from '../src/services/mfa-challenge.service';

const mockSupabaseAdmin = { from: jest.fn() };
const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(),
};

jest.mock('../src/db/supabase', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabaseAdmin,
}));

import { AuthController } from '../src/controllers/auth.controller';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const SESSION = { token: 'access-token', refreshToken: 'refresh-token' };

type MockProfile = {
  id: string;
  email: string;
  role: string;
  tenant_id: string | null;
  mfa_secret: string | null;
  mfa_enabled: boolean;
  require_password_reset?: boolean;
};

let profile: MockProfile;

function configureDatabaseMock(): void {
  mockSupabaseAdmin.from.mockImplementation((table: string) => {
    if (table === 'users') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({ data: { ...profile }, error: null })),
          })),
        })),
        update: jest.fn((changes: Partial<MockProfile>) => ({
          eq: jest.fn(async () => {
            profile = { ...profile, ...changes };
            return { error: null };
          }),
        })),
      };
    }
    if (table === 'tenants') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({ data: null, error: null })),
          })),
        })),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'system_configurations') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(async () => ({ data: null, error: { message: 'not configured' } })),
          })),
        })),
      };
    }
    throw new Error(`Unexpected Supabase table: ${table}`);
  });
}

function responseMock() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status: jest.fn((statusCode: number) => {
      response.statusCode = statusCode;
      return response;
    }),
    json: jest.fn((body: unknown) => {
      response.body = body;
      return response;
    }),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
  return response;
}

function request(body: Record<string, unknown>, cookie?: string): any {
  return { body, headers: cookie ? { cookie } : {} };
}

function cookieFor(token: string): string {
  return `invify_mfa_challenge=${encodeURIComponent(token)}`;
}

async function beginEnrollment() {
  const setup = issueMfaChallenge(USER_A, 'setup', SESSION);
  const response = responseMock();
  await AuthController.mfaSetup(
    request({ userId: USER_A, challengeToken: setup.token }),
    response,
  );
  return response;
}

function nonMagicSecret(): string {
  for (;;) {
    const secret = authenticator.generateSecret();
    const current = authenticator.generate(secret);
    if (current !== '000000' && current !== '123456') return secret;
  }
}

describe('MFA security remediation', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-mfa-signing-secret-at-least-32-characters';
    profile = {
      id: USER_A,
      email: 'user-a@example.test',
      role: 'super_admin',
      tenant_id: null,
      mfa_secret: null,
      mfa_enabled: false,
    };
    jest.clearAllMocks();
    resetMfaChallengesForTests();
    configureDatabaseMock();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('valid authenticated MFA setup succeeds and rotates to verification challenge', async () => {
    const response = await beginEnrollment();
    expect(response.statusCode).toBe(200);
    expect(response.body.secret).toBeTruthy();
    expect(response.body.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
    expect(response.body.challengeToken).toBeTruthy();
    expect(profile.mfa_secret).toBe(response.body.secret);
    expect(() =>
      validateMfaChallenge(response.body.challengeToken, 'verify', USER_A),
    ).not.toThrow();
  });

  test('unauthenticated MFA setup fails', async () => {
    const response = responseMock();
    await AuthController.mfaSetup(request({ userId: USER_A }), response);
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('MFA_CHALLENGE_REQUIRED');
  });

  test('user A cannot enroll MFA for user B', async () => {
    const setup = issueMfaChallenge(USER_A, 'setup', SESSION);
    const response = responseMock();
    await AuthController.mfaSetup(
      request({ userId: USER_B, challengeToken: setup.token }),
      response,
    );
    expect(response.statusCode).toBe(403);
    expect(response.body.error).toBe('MFA_CHALLENGE_USER_MISMATCH');
  });

  test('user A cannot verify MFA for user B', async () => {
    profile.mfa_secret = nonMagicSecret();
    profile.mfa_enabled = true;
    const challenge = issueMfaChallenge(USER_A, 'verify', SESSION);
    const response = responseMock();
    await AuthController.mfaVerify(
      request({
        userId: USER_B,
        challengeToken: challenge.token,
        tokenCode: authenticator.generate(profile.mfa_secret),
      }),
      response,
    );
    expect(response.statusCode).toBe(403);
    expect(response.body.error).toBe('MFA_CHALLENGE_USER_MISMATCH');
  });

  test('missing MFA signing secret fails closed', () => {
    delete process.env.JWT_SECRET;
    expect(() => issueMfaChallenge(USER_A, 'verify', SESSION)).toThrow(
      'MFA challenge signing is not securely configured',
    );
  });

  test.each(['000000', '123456'])('fixed code %s is rejected', async (fixedCode) => {
    profile.mfa_secret = nonMagicSecret();
    profile.mfa_enabled = true;
    const challenge = issueMfaChallenge(USER_A, 'verify', SESSION);
    const response = responseMock();
    await AuthController.mfaVerify(
      request({ userId: USER_A, challengeToken: challenge.token, tokenCode: fixedCode }),
      response,
    );
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Invalid or expired 2FA code');
  });

  test('expired MFA challenge fails', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-25T12:00:00Z'));
    const challenge = issueMfaChallenge(USER_A, 'verify', SESSION);
    jest.advanceTimersByTime(6 * 60 * 1000);
    expect(() => validateMfaChallenge(challenge.token, 'verify', USER_A)).toThrow(
      'invalid or expired',
    );
  });

  test('reused MFA challenge fails', () => {
    const issued = issueMfaChallenge(USER_A, 'verify', SESSION);
    const validated = validateMfaChallenge(issued.token, 'verify', USER_A);
    consumeMfaChallenge(validated);
    expect(() => validateMfaChallenge(issued.token, 'verify', USER_A)).toThrow(
      'already used',
    );
  });

  test('forged MFA challenge fails', () => {
    const issued = issueMfaChallenge(USER_A, 'verify', SESSION);
    const forged = `${issued.token.slice(0, -1)}${issued.token.endsWith('a') ? 'b' : 'a'}`;
    expect(() => validateMfaChallenge(forged, 'verify', USER_A)).toThrow(
      'invalid or expired',
    );
  });

  test('wrong-user challenge fails', () => {
    const issued = issueMfaChallenge(USER_A, 'verify', SESSION);
    expect(() => validateMfaChallenge(issued.token, 'verify', USER_B)).toThrow(
      'not authorized',
    );
  });

  test('invalid TOTP fails without consuming the challenge', async () => {
    profile.mfa_secret = nonMagicSecret();
    profile.mfa_enabled = true;
    const challenge = issueMfaChallenge(USER_A, 'verify', SESSION);
    const response = responseMock();
    await AuthController.mfaVerify(
      request({ challengeToken: challenge.token, tokenCode: '999999' }),
      response,
    );
    expect(response.statusCode).toBe(400);
    expect(() => validateMfaChallenge(challenge.token, 'verify', USER_A)).not.toThrow();
  });

  test('valid TOTP releases the session once through the legitimate flow', async () => {
    profile.mfa_secret = nonMagicSecret();
    profile.mfa_enabled = true;
    const challenge = issueMfaChallenge(USER_A, 'verify', SESSION);
    const response = responseMock();
    await AuthController.mfaVerify(
      request(
        { userId: USER_A, tokenCode: authenticator.generate(profile.mfa_secret) },
        cookieFor(challenge.token),
      ),
      response,
    );
    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBe(SESSION.token);
    expect(response.body.refreshToken).toBe(SESSION.refreshToken);
    expect(() => validateMfaChallenge(challenge.token, 'verify', USER_A)).toThrow(
      'already used',
    );
  });

  test('MFA rate limiting and existing auth route registrations remain present', () => {
    const appSource = fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8');
    expect(appSource).toContain(
      "app.post('/api/auth/mfa/setup', authLimiter, AuthController.mfaSetup)",
    );
    expect(appSource).toContain(
      "app.post('/api/auth/mfa/verify', authLimiter, AuthController.mfaVerify)",
    );
    expect(appSource).toContain(
      "app.post('/api/auth/login', authLimiter, AuthController.login)",
    );
    expect(appSource).toContain(
      "app.post('/api/auth/send-email-otp', verificationLimiter, OnboardingController.sendEmailOtp)",
    );
  });

  test('existing password login still issues an MFA challenge after successful authentication', async () => {
    profile.mfa_secret = nonMagicSecret();
    profile.mfa_enabled = true;
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: USER_A },
        session: { access_token: SESSION.token, refresh_token: SESSION.refreshToken },
      },
      error: null,
    });
    const response = responseMock();
    await AuthController.login(
      {
        body: {
          email: profile.email,
          password: 'valid-password',
          portal: 'admin',
        },
        headers: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      } as any,
      response,
    );
    expect(response.statusCode).toBe(200);
    expect(response.body.requires2FA).toBe(true);
    expect(response.body.challengeToken).toBeTruthy();
  });
});
