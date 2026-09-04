import {
  IDLE_TIMEOUT_MS,
  consumeIdleLogoutNotice,
  hasAnyAuthenticatedSession,
  isIdleExemptPath,
  isIdleExpired,
  markIdleLogoutNotice,
  readLastActivityAt,
  shouldIdleLogout,
} from '../src/auth/idleLogout';

const store: Record<string, string> = {};
const sessionStore: Record<string, string> = {};

Object.defineProperty(global, 'localStorage', {
  configurable: true,
  value: {
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
  },
});

Object.defineProperty(global, 'sessionStorage', {
  configurable: true,
  value: {
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
  },
});

describe('idle auto-logout', () => {
  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key]);
    Object.keys(sessionStore).forEach((key) => delete sessionStore[key]);
  });

  test('expires after 6 minutes of inactivity', () => {
    const started = 1_000_000;
    expect(isIdleExpired(started, started + IDLE_TIMEOUT_MS - 1)).toBe(false);
    expect(isIdleExpired(started, started + IDLE_TIMEOUT_MS)).toBe(true);
  });

  test('does not log out login, MFA, or public pages', () => {
    expect(isIdleExemptPath('/tenant/login')).toBe(true);
    expect(isIdleExemptPath('/admin/login')).toBe(true);
    expect(isIdleExemptPath('/agent/login')).toBe(true);
    expect(isIdleExemptPath('/mfa/challenge')).toBe(true);
    expect(isIdleExemptPath('/tenant/dashboard')).toBe(false);
  });

  test('treats tenant, admin, and agent tokens as signed-in accounts', () => {
    expect(hasAnyAuthenticatedSession()).toBe(false);
    localStorage.setItem('invify_token', 'op-token');
    expect(hasAnyAuthenticatedSession()).toBe(true);
    localStorage.removeItem('invify_token');
    localStorage.setItem('invify_agent_token', 'agent-token');
    expect(hasAnyAuthenticatedSession()).toBe(true);
  });

  test('skips idle logout while MFA is pending', () => {
    expect(
      shouldIdleLogout({
        pathname: '/tenant/dashboard',
        hasSession: true,
        mfaPending: true,
        lastActivityAt: 1,
        now: IDLE_TIMEOUT_MS + 50,
      } as any),
    ).toBe(false);
  });

  test('seeds last activity once so a quiet session still expires', () => {
    localStorage.setItem('invify_token', 'op-token');
    const t0 = 5_000_000;
    const seeded = readLastActivityAt(t0);
    expect(seeded).toBe(t0);
    expect(readLastActivityAt(t0 + 1000)).toBe(t0);
    expect(isIdleExpired(seeded, t0 + IDLE_TIMEOUT_MS)).toBe(true);
  });

  test('stores a one-shot notice for the login screen', () => {
    markIdleLogoutNotice();
    expect(consumeIdleLogoutNotice()).toBe(true);
    expect(consumeIdleLogoutNotice()).toBe(false);
  });
});
