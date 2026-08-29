import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { BuildVariantService } from '../config/build-variant';
import { supabaseAdmin } from '../db/supabase';
import { verifySupabaseAccessToken } from '../utils/supabase-jwt';

export class AuthSessionError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthSessionError';
  }
}

const MOCK_REFRESH = 'mock_refresh_token';

export interface RefreshedSession {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string | null;
  };
}

function ephemeralAuthClient() {
  const { url, key } = BuildVariantService.getInstance().getSupabaseConfig();
  if (!url || !key) {
    throw new AuthSessionError(
      'AUTH_SERVICE_UNAVAILABLE',
      503,
      'Authentication service is not configured',
    );
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function assertRefreshTokenUsable(refreshToken: unknown): string {
  const token = typeof refreshToken === 'string' ? refreshToken.trim() : '';
  if (!token) {
    throw new AuthSessionError('REFRESH_TOKEN_REQUIRED', 401, 'Refresh token is required');
  }
  if (token === MOCK_REFRESH || token.toLowerCase().startsWith('mock_')) {
    throw new AuthSessionError('REFRESH_TOKEN_INVALID', 401, 'Refresh token is invalid');
  }
  return token;
}

/** Decode-only subject peek for binding an expired access token to a verified refresh. Not used as authentication. */
export function peekTokenSubject(accessToken: unknown): string | null {
  if (typeof accessToken !== 'string' || !accessToken.trim()) return null;
  try {
    const payload = jwt.decode(accessToken);
    if (!payload || typeof payload === 'string') return null;
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

async function loadUserProfile(userId: string) {
  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .select('id, email, role, tenant_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new AuthSessionError('PROFILE_NOT_FOUND', 403, 'User profile not found');
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role || 'tenant_admin',
    tenantId: profile.tenant_id ?? null,
  };
}

/**
 * Exchange a Supabase refresh token via an ephemeral client (does not mutate the process-wide supabase singleton).
 * Identity is taken from the verified new access token + users table — never from request tenant/role fields.
 */
export async function exchangeRefreshToken(
  refreshToken: unknown,
  boundUserId?: string | null,
): Promise<RefreshedSession> {
  const usable = assertRefreshTokenUsable(refreshToken);
  const client = ephemeralAuthClient();
  const { data, error } = await client.auth.refreshSession({ refresh_token: usable });

  if (error || !data?.session?.access_token || !data.session.refresh_token || !data.user?.id) {
    throw new AuthSessionError(
      'REFRESH_TOKEN_INVALID',
      401,
      'Refresh token is invalid or expired',
    );
  }

  let verified: { sub?: string };
  try {
    verified = (await verifySupabaseAccessToken(data.session.access_token)) as { sub?: string };
  } catch {
    throw new AuthSessionError(
      'REFRESH_TOKEN_INVALID',
      401,
      'Refreshed session could not be verified',
    );
  }

  const newUserId = data.user.id;
  if (verified.sub && verified.sub !== newUserId) {
    throw new AuthSessionError('REFRESH_TOKEN_INVALID', 401, 'Refreshed session identity mismatch');
  }
  if (boundUserId && boundUserId !== newUserId) {
    throw new AuthSessionError(
      'REFRESH_USER_MISMATCH',
      403,
      'Refresh token is not authorized for this user',
    );
  }

  const profile = await loadUserProfile(newUserId);
  return {
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: profile,
  };
}

async function revokeByUserId(userId: string, accessToken?: string, refreshToken?: string): Promise<boolean> {
  let revoked = false;
  try {
    const adminApi = supabaseAdmin.auth.admin as { signOut?: (...args: any[]) => Promise<unknown> };
    if (typeof adminApi.signOut === 'function') {
      await adminApi.signOut(userId, 'global');
      revoked = true;
    }
  } catch {
    try {
      const adminApi = supabaseAdmin.auth.admin as { signOut?: (...args: any[]) => Promise<unknown> };
      if (accessToken && typeof adminApi.signOut === 'function') {
        await adminApi.signOut(accessToken, 'global');
        revoked = true;
      }
    } catch {
      revoked = false;
    }
  }

  if (accessToken && refreshToken) {
    try {
      const client = ephemeralAuthClient();
      await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      await client.auth.signOut({ scope: 'global' });
      revoked = true;
    } catch {
      // Provider revocation is best-effort; caller still clears local credentials.
    }
  }

  return revoked;
}

/**
 * Best-effort provider revocation. Possession of a refresh token (or a still-valid access token)
 * is required before targeting another user's sessions.
 */
export async function revokeProviderSession(opts: {
  refreshToken?: unknown;
  accessToken?: unknown;
}): Promise<{ revoked: boolean }> {
  const refreshToken =
    typeof opts.refreshToken === 'string' && opts.refreshToken !== MOCK_REFRESH
      ? opts.refreshToken.trim()
      : '';
  const accessToken = typeof opts.accessToken === 'string' ? opts.accessToken.trim() : '';

  try {
    if (refreshToken) {
      const bound = peekTokenSubject(accessToken);
      const exchanged = await exchangeRefreshToken(refreshToken, bound);
      await revokeByUserId(exchanged.user.id, exchanged.token, exchanged.refreshToken);
      return { revoked: true };
    }

    if (accessToken) {
      try {
        const verified = (await verifySupabaseAccessToken(accessToken)) as { sub?: string };
        if (verified.sub) {
          await revokeByUserId(verified.sub, accessToken);
          return { revoked: true };
        }
      } catch {
        return { revoked: false };
      }
    }
  } catch {
    return { revoked: false };
  }

  return { revoked: false };
}
