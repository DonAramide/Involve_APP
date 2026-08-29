import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

const refreshSession = jest.fn();
const adminSignOut = jest.fn();
const setSession = jest.fn();
const clientSignOut = jest.fn();
const usersSingle = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      refreshSession,
      setSession,
      signOut: clientSignOut,
    },
  }),
}));

jest.mock('../src/db/supabase', () => ({
  supabase: { auth: {} },
  supabaseAdmin: {
    auth: { admin: { signOut: (...args: unknown[]) => adminSignOut(...args) } },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: usersSingle,
        }),
      }),
    }),
  },
}));

const verifySupabaseAccessToken = jest.fn();
jest.mock('../src/utils/supabase-jwt', () => ({
  verifySupabaseAccessToken: (...args: unknown[]) => verifySupabaseAccessToken(...args),
}));

import { AuthController } from '../src/controllers/auth.controller';
import {
  AuthSessionError,
  assertRefreshTokenUsable,
  exchangeRefreshToken,
  peekTokenSubject,
} from '../src/services/auth-session.service';

function responseMock() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: unknown) {
      response.body = body;
      return response;
    },
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
  return response;
}

describe('STEP 27 session refresh and logout', () => {
  beforeEach(() => {
    refreshSession.mockReset();
    adminSignOut.mockReset();
    setSession.mockReset();
    clientSignOut.mockReset();
    usersSingle.mockReset();
    verifySupabaseAccessToken.mockReset();
    process.env.LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.LOCAL_SUPABASE_KEY = 'local-test-publishable-placeholder';
    process.env.LOCAL_SUPABASE_SERVICE_KEY = 'local-test-secret-placeholder';
  });

  test('app registers refresh and logout as auth-limited facades', () => {
    const appSource = fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8');
    expect(appSource).toContain("app.post('/api/auth/refresh', authLimiter, AuthController.refresh)");
    expect(appSource).toContain("app.post('/api/auth/logout', authLimiter, AuthController.logout)");
    expect(appSource).toContain("app.post('/api/auth/login', authLimiter, AuthController.login)");
    expect(appSource).toContain("app.post('/api/auth/mfa/setup', authLimiter, AuthController.mfaSetup)");
  });

  test('mock refresh tokens fail closed', () => {
    expect(() => assertRefreshTokenUsable('')).toThrow(AuthSessionError);
    expect(() => assertRefreshTokenUsable('mock_refresh_token')).toThrow(AuthSessionError);
    expect(() => assertRefreshTokenUsable('mock_other')).toThrow(AuthSessionError);
  });

  test('valid Supabase refresh rotates tokens without changing user or tenant', async () => {
    refreshSession.mockResolvedValue({
      data: {
        session: { access_token: 'new-access', refresh_token: 'new-refresh' },
        user: { id: USER_A },
      },
      error: null,
    });
    verifySupabaseAccessToken.mockResolvedValue({ sub: USER_A });
    usersSingle.mockResolvedValue({
      data: { id: USER_A, email: 'a@example.test', role: 'owner', tenant_id: 'tenant-a' },
      error: null,
    });

    const result = await exchangeRefreshToken('supabase-refresh-token');
    expect(result.token).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
    expect(result.user.id).toBe(USER_A);
    expect(result.user.tenantId).toBe('tenant-a');
    expect(result.user.role).toBe('owner');
  });

  test('expired refresh token is rejected', async () => {
    refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid Refresh Token' },
    });
    await expect(exchangeRefreshToken('expired-refresh')).rejects.toMatchObject({
      code: 'REFRESH_TOKEN_INVALID',
      status: 401,
    });
  });

  test('refresh cannot switch to another user', async () => {
    refreshSession.mockResolvedValue({
      data: {
        session: { access_token: 'new-access', refresh_token: 'new-refresh' },
        user: { id: USER_B },
      },
      error: null,
    });
    verifySupabaseAccessToken.mockResolvedValue({ sub: USER_B });
    await expect(exchangeRefreshToken('user-b-refresh', USER_A)).rejects.toMatchObject({
      code: 'REFRESH_USER_MISMATCH',
      status: 403,
    });
  });

  test('controller refresh returns provider session and ignores client tenant/role', async () => {
    refreshSession.mockResolvedValue({
      data: {
        session: { access_token: 'new-access', refresh_token: 'rotated-refresh' },
        user: { id: USER_A },
      },
      error: null,
    });
    verifySupabaseAccessToken.mockResolvedValue({ sub: USER_A });
    usersSingle.mockResolvedValue({
      data: { id: USER_A, email: 'a@example.test', role: 'owner', tenant_id: 'tenant-a' },
      error: null,
    });

    const expiredAccess = jwt.sign({ sub: USER_A, exp: Math.floor(Date.now() / 1000) - 60 }, 'any');
    const res = responseMock();
    await AuthController.refresh(
      {
        body: { refreshToken: 'supabase-refresh', tenantId: 'tenant-b', userId: USER_B, role: 'super_admin' },
        headers: { authorization: `Bearer ${expiredAccess}` },
      } as any,
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('owner');
    expect(res.body.user.tenantId).toBe('tenant-a');
    expect(res.body.user.id).toBe(USER_A);
  });

  test('controller refresh rejects missing refresh token', async () => {
    const res = responseMock();
    await AuthController.refresh({ body: {}, headers: {} } as any, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('REFRESH_TOKEN_REQUIRED');
  });

  test('controller logout always succeeds and clears MFA cookie', async () => {
    adminSignOut.mockResolvedValue({});
    const res = responseMock();
    await AuthController.logout({ body: {}, headers: {} } as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.clearCookie).toHaveBeenCalled();
  });

  test('peekTokenSubject reads sub without treating the token as authenticated', () => {
    const token = jwt.sign({ sub: USER_A, role: 'super_admin' }, 'secret');
    expect(peekTokenSubject(token)).toBe(USER_A);
    expect(peekTokenSubject('not-a-jwt')).toBe(null);
  });
});
