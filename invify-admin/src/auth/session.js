/**
 * Invify Admin session lifecycle.
 *
 * Access/refresh tokens are Supabase Auth credentials issued by invify-backend.
 * This module does not mint tokens. It persists, refreshes (once, single-flight),
 * and clears operator session state.
 */

import { loginPathForContext as resolveLoginPath } from '../utils/authLoginPaths';

export const SESSION_STORAGE_KEYS = [
  'invify_token',
  'invify_refresh_token',
  'invify_access_token',
  'operator_role',
  'operator_email',
  'operator_userId',
  'operator_first_name',
  'operator_last_name',
  'operator_joined',
  'mfa_status_verified',
  'impersonation_context',
  'tenant_id',
  'tenant_type',
  'operator_active_tenant',
  'supabase_token',
];

export const SESSION_STORAGE_TRANSIENT_KEYS = [
  'mfa_setup_token',
  'mfa_setup_userId',
  'mfa_challenge_token',
  'mfa_challenge_userId',
];

export function isMfaChallengePending() {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return !!(
      sessionStorage.getItem('mfa_setup_token') ||
      sessionStorage.getItem('mfa_challenge_token')
    );
  } catch {
    return false;
  }
}

/** Live access token that already cleared MFA. Stale challenge leftovers must not hijack it. */
export function hasVerifiedOperatorSession() {
  if (!readAccessToken()) return false;
  try {
    return localStorage.getItem('mfa_status_verified') !== 'false';
  } catch {
    return true;
  }
}

const SOFT_SESSION_FAILURE_MARKERS = [
  '/api/notifications',
  '/notifications',
  '/api/dashboard/',
  '/dashboard/',
  '/api/v1/runtime/config',
  '/v1/runtime/config',
  '/api/v1/finance',
  '/api/finance',
  '/api/v1/wallet',
  '/api/inventory',
  '/api/v1/inventory',
];

/** Background/overview GETs that should degrade instead of wiping the operator session. */
export function isSoftSessionFailureUrl(url) {
  const value = String(url || '').toLowerCase();
  return SOFT_SESSION_FAILURE_MARKERS.some((marker) => value.includes(marker));
}

const AUTH_PATH_MARKERS = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/mfa',
  '/api/auth/reset-password',
  '/api/auth/send-email-otp',
  '/api/auth/verify-email-otp',
];

let logoutGeneration = 0;
let refreshInFlight = null;

export function isAuthSessionUrl(url) {
  const value = String(url || '');
  return AUTH_PATH_MARKERS.some((marker) => value.includes(marker));
}

export function isLoggedOut() {
  return logoutGeneration > 0 && !readAccessToken();
}

export function readAccessToken() {
  try {
    return localStorage.getItem('invify_token');
  } catch {
    return null;
  }
}

export function readRefreshToken() {
  try {
    return localStorage.getItem('invify_refresh_token');
  } catch {
    return null;
  }
}

export function persistAuthenticatedSession(tokenData = {}) {
  logoutGeneration = 0;
  const accessToken = tokenData.token || tokenData.access_token;
  const refreshToken = tokenData.refreshToken || tokenData.refresh_token;
  if (accessToken) {
    localStorage.setItem('invify_token', accessToken);
    localStorage.setItem('invify_access_token', accessToken);
    localStorage.setItem('supabase_token', accessToken);
  }
  if (refreshToken) {
    localStorage.setItem('invify_refresh_token', refreshToken);
  }
  const user = tokenData.user || {};
  if (user.id) localStorage.setItem('operator_userId', user.id);
  if (user.email) localStorage.setItem('operator_email', user.email);
  if (user.role) localStorage.setItem('operator_role', String(user.role).toUpperCase());
  if (user.tenantId) localStorage.setItem('tenant_id', user.tenantId);
  localStorage.setItem('mfa_status_verified', 'true');
  clearMfaChallengeState();
  try {
    localStorage.setItem('invify_last_activity_at', String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearMfaChallengeState() {
  if (typeof sessionStorage === 'undefined') return;
  for (const key of SESSION_STORAGE_TRANSIENT_KEYS) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function clearAuthenticatedSession() {
  refreshInFlight = null;
  for (const key of SESSION_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  if (typeof sessionStorage !== 'undefined') {
    for (const key of SESSION_STORAGE_TRANSIENT_KEYS) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }
}

function usableRefreshToken(token) {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (trimmed === 'mock_refresh_token' || trimmed.toLowerCase().startsWith('mock_')) return false;
  return true;
}

export async function refreshSessionSingleFlight(api) {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const generation = logoutGeneration;
    const refreshToken = readRefreshToken();
    if (!usableRefreshToken(refreshToken)) {
      throw new Error('REFRESH_TOKEN_MISSING');
    }
    const accessToken = readAccessToken();
    const response = await api.post(
      '/api/auth/refresh',
      { refreshToken },
      {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        _invifySkipRefresh: true,
      },
    );
    if (generation !== logoutGeneration) {
      throw new Error('REFRESH_ABORTED_LOGOUT');
    }
    const body = response?.data || {};
    if (!body.token || !body.refreshToken) {
      throw new Error('REFRESH_RESPONSE_INVALID');
    }
    persistAuthenticatedSession(body);
    return body;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function logoutAuthenticatedSession(api, { redirect = true } = {}) {
  const refreshToken = readRefreshToken();
  const accessToken = readAccessToken();
  logoutGeneration += 1;
  refreshInFlight = null;

  if (api && (refreshToken || accessToken)) {
    try {
      await api.post(
        '/api/auth/logout',
        refreshToken ? { refreshToken } : {},
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          _invifySkipRefresh: true,
        },
      );
    } catch {
      /* local clear still proceeds */
    }
  }

  clearAuthenticatedSession();

  if (redirect && typeof window !== 'undefined' && window.location) {
    window.location.href = resolveLoginPath();
  }
}

export function attachSessionInterceptors(api, { Notify, loginPathForContext } = {}) {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status;
      const original = error.config || {};

      if (status === 403) {
        if (Notify) {
          Notify.create({
            type: 'warning',
            message:
              'Access Restricted: This feature is out of your control or operates in Read-Only mode for your role.',
            position: 'top-right',
            timeout: 4000,
            icon: 'lock',
          });
        }
        return Promise.reject(error);
      }

      if (status !== 401) {
        return Promise.reject(error);
      }

      // Login succeeded but MFA is still pending — no access token yet.
      // A 401 from runtime/config must not wipe the MFA challenge.
      if (isMfaChallengePending() && !readAccessToken()) {
        return Promise.reject(error);
      }

      if (original._invifySkipRefresh || isAuthSessionUrl(original.url)) {
        return Promise.reject(error);
      }

      const keepSession = isSoftSessionFailureUrl(original.url);

      if (original._invifyRetry) {
        if (!keepSession) failClosedLogout({ Notify, loginPathForContext });
        return Promise.reject(error);
      }

      if (!usableRefreshToken(readRefreshToken())) {
        if (!keepSession) failClosedLogout({ Notify, loginPathForContext });
        return Promise.reject(error);
      }

      try {
        await refreshSessionSingleFlight(api);
        original._invifyRetry = true;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${readAccessToken()}`;
        return api.request(original);
      } catch {
        if (!keepSession) failClosedLogout({ Notify, loginPathForContext });
        return Promise.reject(error);
      }
    },
  );
}

function failClosedLogout({ Notify, loginPathForContext }) {
  logoutGeneration += 1;
  clearAuthenticatedSession();
  if (typeof window === 'undefined' || !window.location) return;

  const currentPath = window.location.pathname;
  const loginPath = loginPathForContext
    ? loginPathForContext({ pathname: currentPath })
    : '/admin/login';
  if (
    currentPath === loginPath ||
    currentPath === '/login' ||
    currentPath === '/admin/login' ||
    currentPath === '/tenant/login'
  ) {
    return;
  }

  if (Notify) {
    Notify.create({
      type: 'negative',
      message: 'Session Expired: You have been logged out. Please log in again.',
      position: 'top-right',
      timeout: 4500,
      icon: 'logout',
    });
  }
  window.location.href = loginPath;
}

export function _resetSessionRuntimeForTests() {
  logoutGeneration = 0;
  refreshInFlight = null;
}
