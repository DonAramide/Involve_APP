/**
 * Admin session lifecycle tests.
 */

const store: Record<string, string> = {};
const sessionStore: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
  setItem: (key: string, value: string) => {
    store[key] = String(value);
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((key) => delete store[key]);
  },
};

const sessionStorageMock = {
  getItem: (key: string) =>
    Object.prototype.hasOwnProperty.call(sessionStore, key) ? sessionStore[key] : null,
  setItem: (key: string, value: string) => {
    sessionStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete sessionStore[key];
  },
  clear: () => {
    Object.keys(sessionStore).forEach((key) => delete sessionStore[key]);
  },
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true });
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, configurable: true });

jest.mock('../src/utils/authLoginPaths', () => ({
  loginPathForContext: ({ pathname } = { pathname: '' }) =>
    String(pathname || '').startsWith('/tenant') ? '/tenant/login' : '/admin/login',
}));

import {
  SESSION_STORAGE_KEYS,
  _resetSessionRuntimeForTests,
  attachSessionInterceptors,
  clearAuthenticatedSession,
  persistAuthenticatedSession,
  refreshSessionSingleFlight,
  logoutAuthenticatedSession,
  isAuthSessionUrl,
  hasVerifiedOperatorSession,
  isSoftSessionFailureUrl,
} from '../src/auth/session';

describe('Admin session lifecycle', () => {
  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    _resetSessionRuntimeForTests();
  });

  test('persist stores access and refresh credentials', () => {
    persistAuthenticatedSession({
      token: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 'user-a', email: 'a@x.test', role: 'owner', tenantId: 'tenant-a' },
    });
    expect(localStorage.getItem('invify_token')).toBe('access-1');
    expect(localStorage.getItem('invify_refresh_token')).toBe('refresh-1');
    expect(localStorage.getItem('tenant_id')).toBe('tenant-a');
    expect(localStorage.getItem('operator_role')).toBe('OWNER');
    expect(localStorage.getItem('supabase_token')).toBe('access-1');
    expect(localStorage.getItem('invify_access_token')).toBe('access-1');
    expect(hasVerifiedOperatorSession()).toBe(true);
  });

  test('persist accepts refresh_token alias from provider payloads', () => {
    persistAuthenticatedSession({
      token: 'access-2',
      refresh_token: 'refresh-alias',
      user: { id: 'user-b', role: 'super_admin' },
    });
    expect(localStorage.getItem('invify_refresh_token')).toBe('refresh-alias');
  });

  test('verified access token is not treated as MFA-pending leftover', () => {
    persistAuthenticatedSession({
      token: 'access-1',
      refreshToken: 'refresh-1',
      user: { role: 'SUPER_ADMIN' },
    });
    sessionStorage.setItem('mfa_challenge_token', 'stale-challenge');
    expect(hasVerifiedOperatorSession()).toBe(true);
  });

  test('soft 401 urls include dashboard and notifications', () => {
    expect(isSoftSessionFailureUrl('/api/notifications')).toBe(true);
    expect(isSoftSessionFailureUrl('/api/dashboard/overview')).toBe(true);
    expect(isSoftSessionFailureUrl('/api/v1/finance/executive-summary')).toBe(true);
    expect(isSoftSessionFailureUrl('/api/v1/wallet')).toBe(true);
    expect(isSoftSessionFailureUrl('/payments/history')).toBe(false);
  });

  test('logout clears access token, refresh token, tenant context, and MFA transients', async () => {
    persistAuthenticatedSession({
      token: 'access-1',
      refreshToken: 'refresh-1',
      user: { id: 'user-a', email: 'a@x.test', role: 'owner', tenantId: 'tenant-a' },
    });
    localStorage.setItem('tenant_type', 'school');
    localStorage.setItem('impersonation_context', '{"x":1}');
    sessionStorage.setItem('mfa_setup_token', 'pending');
    localStorage.setItem('invify_public_locale', 'en');

    const api = { post: jest.fn().mockResolvedValue({ data: { ok: true } }) };
    await logoutAuthenticatedSession(api, { redirect: false });

    expect(api.post).toHaveBeenCalledWith(
      '/api/auth/logout',
      { refreshToken: 'refresh-1' },
      expect.objectContaining({ _invifySkipRefresh: true }),
    );
    expect(localStorage.getItem('invify_token')).toBeNull();
    expect(localStorage.getItem('invify_refresh_token')).toBeNull();
    expect(localStorage.getItem('tenant_id')).toBeNull();
    expect(localStorage.getItem('tenant_type')).toBeNull();
    expect(localStorage.getItem('mfa_status_verified')).toBeNull();
    expect(sessionStorage.getItem('mfa_setup_token')).toBeNull();
    expect(localStorage.getItem('invify_public_locale')).toBe('en');
    expect(SESSION_STORAGE_KEYS).toContain('invify_refresh_token');
  });

  test('explicit logout prevents a later refresh', async () => {
    persistAuthenticatedSession({ token: 'access-1', refreshToken: 'refresh-1' });
    const api = { post: jest.fn().mockResolvedValue({ data: { ok: true } }) };
    await logoutAuthenticatedSession(api, { redirect: false });
    await expect(refreshSessionSingleFlight(api)).rejects.toThrow('REFRESH_TOKEN_MISSING');
  });

  test('concurrent expired requests share one refresh', async () => {
    persistAuthenticatedSession({ token: 'old-access', refreshToken: 'refresh-1' });
    let resolvePost: (value: unknown) => void = () => undefined;
    const api = {
      post: jest.fn(
        () =>
          new Promise((resolve) => {
            resolvePost = resolve;
          }),
      ),
    };

    const first = refreshSessionSingleFlight(api);
    const second = refreshSessionSingleFlight(api);
    expect(api.post).toHaveBeenCalledTimes(1);
    resolvePost({ data: { token: 'new-access', refreshToken: 'new-refresh', user: { id: 'user-a' } } });
    const [a, b] = await Promise.all([first, second]);
    expect(a.token).toBe('new-access');
    expect(b.token).toBe('new-access');
    expect(localStorage.getItem('invify_token')).toBe('new-access');
    expect(localStorage.getItem('invify_refresh_token')).toBe('new-refresh');
  });

  test('401 interceptor refreshes once then retries original request', async () => {
    persistAuthenticatedSession({ token: 'old-access', refreshToken: 'refresh-1' });
    const errorHandlers: Array<(err: any) => Promise<unknown>> = [];
    const api: any = {
      interceptors: {
        response: { use: (_ok: unknown, err: (e: any) => Promise<unknown>) => errorHandlers.push(err) },
      },
      post: jest.fn().mockResolvedValue({
        data: { token: 'new-access', refreshToken: 'new-refresh', user: { id: 'user-a' } },
      }),
      request: jest.fn().mockResolvedValue({ status: 200, data: { ok: true } }),
    };
    attachSessionInterceptors(api);
    const result = await errorHandlers[0]({
      response: { status: 401 },
      config: { url: '/payments/history', headers: {} },
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 200, data: { ok: true } });
  });

  test('403 does not trigger refresh', async () => {
    persistAuthenticatedSession({ token: 'old-access', refreshToken: 'refresh-1' });
    const errorHandlers: Array<(err: any) => Promise<unknown>> = [];
    const api: any = {
      interceptors: {
        response: { use: (_ok: unknown, err: (e: any) => Promise<unknown>) => errorHandlers.push(err) },
      },
      post: jest.fn(),
      request: jest.fn(),
    };
    attachSessionInterceptors(api);
    await expect(
      errorHandlers[0]({
        response: { status: 403 },
        config: { url: '/payments/history', headers: {} },
      }),
    ).rejects.toMatchObject({ response: { status: 403 } });
    expect(api.post).not.toHaveBeenCalled();
  });

  test('auth endpoints do not enter a refresh loop', async () => {
    persistAuthenticatedSession({ token: 'old-access', refreshToken: 'refresh-1' });
    const errorHandlers: Array<(err: any) => Promise<unknown>> = [];
    const api: any = {
      interceptors: {
        response: { use: (_ok: unknown, err: (e: any) => Promise<unknown>) => errorHandlers.push(err) },
      },
      post: jest.fn(),
      request: jest.fn(),
    };
    attachSessionInterceptors(api);
    await expect(
      errorHandlers[0]({
        response: { status: 401 },
        config: { url: '/api/auth/refresh', headers: {} },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(api.post).not.toHaveBeenCalled();
    expect(isAuthSessionUrl('/api/auth/login')).toBe(true);
  });

  test('failed refresh clears session state', async () => {
    persistAuthenticatedSession({ token: 'old-access', refreshToken: 'refresh-1' });
    const errorHandlers: Array<(err: any) => Promise<unknown>> = [];
    const api: any = {
      interceptors: {
        response: { use: (_ok: unknown, err: (e: any) => Promise<unknown>) => errorHandlers.push(err) },
      },
      post: jest.fn().mockRejectedValue(new Error('invalid')),
      request: jest.fn(),
    };
    attachSessionInterceptors(api, {
      loginPathForContext: () => '/admin/login',
    });
    await expect(
      errorHandlers[0]({
        response: { status: 401 },
        config: { url: '/payments/history', headers: {} },
      }),
    ).rejects.toBeTruthy();
    expect(localStorage.getItem('invify_token')).toBeNull();
    expect(localStorage.getItem('invify_refresh_token')).toBeNull();
    expect(api.request).not.toHaveBeenCalled();
  });

  test('401 on dashboard overview does not wipe a live session', async () => {
    persistAuthenticatedSession({ token: 'old-access', refreshToken: 'refresh-1' });
    const errorHandlers: Array<(err: any) => Promise<unknown>> = [];
    const api: any = {
      interceptors: {
        response: { use: (_ok: unknown, err: (e: any) => Promise<unknown>) => errorHandlers.push(err) },
      },
      post: jest.fn().mockRejectedValue(new Error('invalid')),
      request: jest.fn(),
    };
    attachSessionInterceptors(api, {
      loginPathForContext: () => '/admin/login',
    });
    await expect(
      errorHandlers[0]({
        response: { status: 401 },
        config: { url: '/api/dashboard/overview', headers: {} },
      }),
    ).rejects.toBeTruthy();
    expect(localStorage.getItem('invify_token')).toBe('old-access');
    expect(localStorage.getItem('invify_refresh_token')).toBe('refresh-1');
  });

  test('clearAuthenticatedSession does not leave MFA challenge material', () => {
    sessionStorage.setItem('mfa_setup_token', 'x');
    sessionStorage.setItem('mfa_setup_userId', 'y');
    localStorage.setItem('mfa_status_verified', 'false');
    clearAuthenticatedSession();
    expect(sessionStorage.getItem('mfa_setup_token')).toBeNull();
    expect(sessionStorage.getItem('mfa_setup_userId')).toBeNull();
    expect(localStorage.getItem('mfa_status_verified')).toBeNull();
  });
});
