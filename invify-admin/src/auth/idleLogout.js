/**
 * Idle auto-logout for every web account (tenant, platform admin, agent).
 * 6 minutes without pointer/keyboard/touch activity ends the session.
 */

import {
  isMfaChallengePending,
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
  lastActivityAt,
  now = Date.now(),
  timeoutMs = IDLE_TIMEOUT_MS,
} = {}) {
  if (mfaPending) return false;
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
      if (
        shouldIdleLogout({
          pathname: window.location.pathname,
          hasSession: hasAnyAuthenticatedSession(),
          mfaPending: isMfaChallengePending(),
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
