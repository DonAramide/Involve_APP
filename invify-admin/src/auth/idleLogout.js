/**
 * Idle auto-logout for every web account (tenant, platform admin, agent).
 * 6 minutes without pointer/keyboard/touch activity ends the session.
 */

import {
  isAuthSessionUrl,
  isMfaChallengePending,
  isSoftSessionFailureUrl,
  logoutAuthenticatedSession,
  readAccessToken,
} from './session';
import { loginPathForContext } from '../utils/authLoginPaths';

export const IDLE_TIMEOUT_MS = 6 * 60 * 1000;
export const IDLE_ACTIVITY_STORAGE_KEY = 'invify_last_activity_at';
export const IDLE_LOGOUT_NOTICE_KEY = 'invify_idle_logout';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
const TICK_MS = 10000;
const TOUCH_THROTTLE_MS = 1000;

let idleHoldCount = 0;

export function isIdleLogoutHeld() {
  return idleHoldCount > 0;
}

export function holdIdleLogout(now = Date.now()) {
  idleHoldCount += 1;
  stampIdleActivity(now);
}

export function releaseIdleLogout(now = Date.now()) {
  idleHoldCount = Math.max(0, idleHoldCount - 1);
  stampIdleActivity(now);
}

export function _resetIdleHoldForTests() {
  idleHoldCount = 0;
}

/** In-flight API work counts as activity so long uploads are not idle-logged-out. */
export function shouldHoldIdleForRequest(config = {}) {
  if (config.idleHold === false) return false;
  if (config.idleHold === true) return true;
  const url = String(config.url || '');
  if (isAuthSessionUrl(url)) return false;
  const method = String(config.method || 'get').toLowerCase();
  if (method === 'get' && isSoftSessionFailureUrl(url)) return false;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) return true;
  if (Number(config.timeout) > IDLE_TIMEOUT_MS) return true;
  return ['post', 'put', 'patch', 'delete'].includes(method) || method === 'get';
}

function hasVisibleLoadingUi() {
  if (typeof document === 'undefined') return false;
  try {
    return Boolean(
      document.querySelector('.q-loading') ||
        document.querySelector('.q-inner-loading') ||
        document.querySelector('[data-idle-hold="true"]'),
    );
  } catch {
    return false;
  }
}

export function attachIdleHoldInterceptors(api) {
  if (!api?.interceptors) return;
  api.interceptors.request.use((config) => {
    if (!shouldHoldIdleForRequest(config)) return config;
    holdIdleLogout();
    config._idleHold = true;
    const prevUp = config.onUploadProgress;
    const prevDown = config.onDownloadProgress;
    config.onUploadProgress = (event) => {
      stampIdleActivity();
      if (typeof prevUp === 'function') prevUp(event);
    };
    config.onDownloadProgress = (event) => {
      stampIdleActivity();
      if (typeof prevDown === 'function') prevDown(event);
    };
    return config;
  });
  const releaseHeld = (config) => {
    if (!config?._idleHold) return;
    config._idleHold = false;
    releaseIdleLogout();
  };
  api.interceptors.response.use(
    (response) => {
      releaseHeld(response?.config);
      return response;
    },
    (error) => {
      releaseHeld(error?.config);
      return Promise.reject(error);
    },
  );
}

const IDLE_EXEMPT_PREFIXES = [
  '/admin/login',
  '/tenant/login',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/mfa/challenge',
  '/agent/login',
  '/agent/signup',
  '/agent/success',
];

export function hasAnyAuthenticatedSession() {
  try {
    return !!(readAccessToken() || localStorage.getItem('invify_agent_token'));
  } catch {
    return false;
  }
}

export function isIdleExemptPath(pathname = '') {
  const path = String(pathname || '').toLowerCase();
  if (!path || path === '/') return true;
  return IDLE_EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function stampIdleActivity(now = Date.now()) {
  try {
    localStorage.setItem(IDLE_ACTIVITY_STORAGE_KEY, String(now));
  } catch {
    /* ignore */
  }
}

export function readLastActivityAt(now = Date.now()) {
  try {
    const raw = localStorage.getItem(IDLE_ACTIVITY_STORAGE_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    if (hasAnyAuthenticatedSession()) {
      stampIdleActivity(now);
    }
  } catch {
    /* ignore */
  }
  return now;
}

export function isIdleExpired(lastActivityAt, now = Date.now(), timeoutMs = IDLE_TIMEOUT_MS) {
  return now - Number(lastActivityAt || 0) >= timeoutMs;
}

/**
 * @param {{
 *   pathname?: string,
 *   hasSession?: boolean,
 *   mfaPending?: boolean,
 *   lastActivityAt?: number,
 *   now?: number,
 *   timeoutMs?: number,
 * }} [input]
 */
export function shouldIdleLogout({
  pathname,
  hasSession,
  mfaPending,
  busyHold,
  lastActivityAt,
  now = Date.now(),
  timeoutMs = IDLE_TIMEOUT_MS,
} = {}) {
  if (mfaPending) return false;
  if (busyHold) return false;
  if (!hasSession) return false;
  if (isIdleExemptPath(pathname)) return false;
  return isIdleExpired(lastActivityAt, now, timeoutMs);
}

export function markIdleLogoutNotice() {
  try {
    sessionStorage.setItem(IDLE_LOGOUT_NOTICE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumeIdleLogoutNotice() {
  try {
    const flagged = sessionStorage.getItem(IDLE_LOGOUT_NOTICE_KEY) === '1';
    if (flagged) sessionStorage.removeItem(IDLE_LOGOUT_NOTICE_KEY);
    return flagged;
  } catch {
    return false;
  }
}

export function resolveIdleLoginPath(pathname) {
  const path = String(pathname || '');
  if (path.toLowerCase().startsWith('/agent')) return '/agent/login';
  return loginPathForContext({ pathname: path });
}

export function clearAgentSession() {
  try {
    localStorage.removeItem('invify_agent_token');
    localStorage.removeItem('invify_agent_info');
  } catch {
    /* ignore */
  }
}

export function startIdleLogoutWatchdog({
  api,
  Notify,
  nowFn = Date.now,
  timeoutMs = IDLE_TIMEOUT_MS,
  isBusy,
} = {}) {
  if (typeof window === 'undefined') return () => {};

  let ticking = false;
  let lastTouchWrite = 0;
  let timer = null;
  let loggingOut = false;

  const touch = () => {
    if (!hasAnyAuthenticatedSession() || isMfaChallengePending()) return;
    const now = nowFn();
    if (now - lastTouchWrite < TOUCH_THROTTLE_MS) return;
    lastTouchWrite = now;
    stampIdleActivity(now);
  };

  const logoutIdle = async () => {
    if (loggingOut) return;
    loggingOut = true;
    markIdleLogoutNotice();
    const loginPath = resolveIdleLoginPath(window.location.pathname);
    clearAgentSession();
    try {
      localStorage.removeItem(IDLE_ACTIVITY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    await logoutAuthenticatedSession(api, { redirect: false });
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = loginPath;
    }
  };

  const tick = () => {
    if (ticking || loggingOut) return;
    ticking = true;
    try {
      const busy =
        isIdleLogoutHeld() ||
        hasVisibleLoadingUi() ||
        (typeof isBusy === 'function' && Boolean(isBusy()));
      if (busy) {
        stampIdleActivity(nowFn());
        return;
      }
      if (
        shouldIdleLogout({
          pathname: window.location.pathname,
          hasSession: hasAnyAuthenticatedSession(),
          mfaPending: isMfaChallengePending(),
          busyHold: busy,
          lastActivityAt: readLastActivityAt(nowFn()),
          now: nowFn(),
          timeoutMs,
        })
      ) {
        void logoutIdle();
      }
    } finally {
      ticking = false;
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') tick();
  };

  const onStorage = (event) => {
    if (event.key === IDLE_ACTIVITY_STORAGE_KEY) tick();
  };

  touch();
  ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, touch, { passive: true }));
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('storage', onStorage);
  timer = window.setInterval(tick, TICK_MS);

  return () => {
    ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, touch));
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('storage', onStorage);
    if (timer) window.clearInterval(timer);
  };
}
