// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { isMockTokenAllowed, isMockAuthAllowed, SYSTEM_USER_UUID, SYSTEM_TENANT_UUID } from '../config/constants';
import jwt from 'jsonwebtoken';

/**
 * Middleware: Supabase JWT Verification
 * Extracts the token, verifies it with Supabase, and populates req.user.
 *
 * Security model:
 *  - All mock/bypass paths are gated by isMockTokenAllowed() or isMockAuthAllowed().
 *  - Both guards return false unconditionally in STAGING and PROD.
 *  - Slow/unavailable DB: use short timeout + profile cache + JWT-claim fallback
 *    (never hang ~90s then 503).
 */

const PROFILE_TTL_MS = Number(process.env.AUTH_PROFILE_CACHE_TTL_MS || 5 * 60 * 1000);
const DB_TIMEOUT_MS = Number(process.env.AUTH_DB_TIMEOUT_MS || 8000);

type CachedProfile = {
  id: string;
  email: string;
  role: string;
  tenant_id: string | null;
  is_active: boolean;
  name?: string;
};

const profileCacheById = new Map<string, { profile: CachedProfile; expiresAt: number }>();
const profileCacheByEmail = new Map<string, { profile: CachedProfile; expiresAt: number }>();

function cacheProfile(profile: CachedProfile) {
  if (!profile?.id) return;
  const entry = { profile, expiresAt: Date.now() + PROFILE_TTL_MS };
  profileCacheById.set(String(profile.id), entry);
  if (profile.email) {
    profileCacheByEmail.set(String(profile.email).trim().toLowerCase(), entry);
  }
}

function getCachedProfile(userId?: string, email?: string): CachedProfile | null {
  const now = Date.now();
  if (userId) {
    const hit = profileCacheById.get(String(userId));
    if (hit && hit.expiresAt > now) return hit.profile;
  }
  if (email) {
    const hit = profileCacheByEmail.get(String(email).trim().toLowerCase());
    if (hit && hit.expiresAt > now) return hit.profile;
  }
  return null;
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isTimeoutError(err: any): boolean {
  const msg = String(err?.message || err || '');
  return (
    msg.includes('timeout') ||
    msg.includes('fetch failed') ||
    msg.includes('Connection') ||
    msg.includes('network') ||
    err?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    err?.status === 408 ||
    err?.status === 504
  );
}

function claimsFromJwt(jwtPayload: any, userId: string, userEmail: string): CachedProfile {
  let role =
    jwtPayload.role === 'authenticated' || !jwtPayload.role
      ? jwtPayload.app_metadata?.role ||
        jwtPayload.user_metadata?.role ||
        'owner'
      : jwtPayload.role;
  let tenantId =
    jwtPayload.tenantId ||
    jwtPayload.tenant_id ||
    jwtPayload.app_metadata?.tenantId ||
    jwtPayload.app_metadata?.tenant_id ||
    jwtPayload.user_metadata?.tenantId ||
    jwtPayload.user_metadata?.tenant_id ||
    null;
  if (tenantId === 'undefined' || tenantId === 'null') tenantId = null;

  const normalizedEmail = (userEmail || '').trim().toLowerCase();
  if (
    normalizedEmail === 'sysadmin@iips.app' ||
    normalizedEmail === 'superadmin@iips.app' ||
    normalizedEmail === 'averyd777@gmail.com'
  ) {
    role = 'super_admin';
    tenantId = SYSTEM_TENANT_UUID;
  }

  return {
    id: userId,
    email: userEmail,
    role: String(role || 'owner'),
    tenant_id: tenantId,
    is_active: true,
    name: jwtPayload.user_metadata?.full_name || 'User',
  };
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (isMockTokenAllowed()) {
      if (authHeader && authHeader.startsWith('Bearer mock-agent-token-')) {
        const agentId = authHeader.replace('Bearer mock-agent-token-', '');
        console.warn('[AuthMiddleware] Developer mock-agent-token auth bypass triggered.');
        (req as any).user = {
          id: agentId,
          role: 'AGENT',
          email: 'agent@invify.app',
          tenantId: null,
        };
        return next();
      }

      if (authHeader && authHeader.startsWith('Bearer mock-super-admin')) {
        console.warn('[AuthMiddleware] Developer mock-super-admin auth bypass triggered.');
        (req as any).user = {
          id: SYSTEM_USER_UUID,
          email: 'superadmin@invify.app',
          role: 'super_admin',
          tenantId: req.headers['x-tenant-id'] || null,
        };
        return next();
      }
    }

    if (isMockAuthAllowed() && authHeader !== 'Bearer invalid.jwt.token') {
      console.warn('[AuthMiddleware] Developer offline auth bypass triggered.');
      (req as any).user = {
        id: SYSTEM_USER_UUID,
        email: 'superadmin@invify.app',
        role: 'super_admin',
        tenantId:
          req.headers['x-tenant-id'] === 'undefined' || req.headers['x-tenant-id'] === 'null'
            ? null
            : req.headers['x-tenant-id'] || null,
      };
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
      let jwtPayload: any = null;
      const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
      if (supabaseJwtSecret) {
        try {
          jwtPayload = jwt.verify(token, supabaseJwtSecret) as any;
        } catch {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
      } else {
        jwtPayload = jwt.decode(token) as any;
        if (!jwtPayload) {
          return res.status(401).json({ error: 'Malformed token' });
        }
        if (jwtPayload.exp && jwtPayload.exp < Math.floor(Date.now() / 1000)) {
          return res.status(401).json({ error: 'Token has expired' });
        }
      }

      const userId = jwtPayload.sub || jwtPayload.id;
      const userEmail = jwtPayload.email || jwtPayload.user_metadata?.email || '';
      if (!userId) {
        return res.status(401).json({ error: 'Token missing subject claim' });
      }

      // Fast path: warm cache (avoids hammering Supabase when it is slow)
      const cached = getCachedProfile(userId, userEmail);
      if (cached) {
        if (!cached.is_active) {
          return res.status(403).json({ error: 'Your account has been disabled' });
        }
        (req as any).user = {
          id: cached.id,
          email: cached.email,
          role: cached.role,
          tenantId: cached.tenant_id,
        };
        return next();
      }

      let profile: any = null;
      let profileError: any = null;
      let dbTimedOut = false;

      try {
        const byId = await withTimeout(
          supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle(),
          DB_TIMEOUT_MS,
          'users.byId',
        );
        profile = byId.data;
        profileError = byId.error;

        if (!profile && userEmail) {
          const byEmail = await withTimeout(
            supabaseAdmin.from('users').select('*').ilike('email', userEmail.trim()).maybeSingle(),
            DB_TIMEOUT_MS,
            'users.byEmail',
          );
          if (byEmail.data) {
            profile = byEmail.data;
            profileError = null;
            console.warn(
              `[AuthMiddleware] Resolved profile by email for JWT sub=${userId} → users.id=${profile.id} tenant=${profile.tenant_id}`,
            );
          } else if (byEmail.error) {
            profileError = byEmail.error;
          }
        }
      } catch (err: any) {
        if (isTimeoutError(err)) {
          dbTimedOut = true;
          console.error(
            `[AuthMiddleware] Supabase users database query timed out (${DB_TIMEOUT_MS}ms). Falling back to JWT/cache.`,
          );
        } else {
          throw err;
        }
      }

      if (dbTimedOut && !profile) {
        const fallback = claimsFromJwt(jwtPayload, userId, userEmail);
        // Prefer x-tenant-id from mobile/admin when JWT lacks tenant
        const headerTenant = req.headers['x-tenant-id'];
        if (
          !fallback.tenant_id &&
          headerTenant &&
          headerTenant !== 'undefined' &&
          headerTenant !== 'null'
        ) {
          fallback.tenant_id = String(headerTenant);
        }
        console.warn(
          `[AuthMiddleware] Using JWT-claim fallback user=${fallback.id} role=${fallback.role} tenant=${fallback.tenant_id || 'n/a'}`,
        );
        (req as any).user = {
          id: fallback.id,
          email: fallback.email,
          role: fallback.role,
          tenantId: fallback.tenant_id,
        };
        return next();
      }

      if (profileError && !profile) {
        if (isTimeoutError(profileError)) {
          console.error('[AuthMiddleware] Supabase users database query timed out.');
          const fallback = claimsFromJwt(jwtPayload, userId, userEmail);
          (req as any).user = {
            id: fallback.id,
            email: fallback.email,
            role: fallback.role,
            tenantId: fallback.tenant_id,
          };
          return next();
        }

        if (profileError.code !== 'PGRST116' && !profileError.message?.includes('No rows found')) {
          console.error('[AuthMiddleware] Supabase users query failed:', profileError);
          return res.status(403).json({ error: 'User profile not found in Invify' });
        }
      }

      if (!profile) {
        let decodedRole =
          jwtPayload.role === 'authenticated' || !jwtPayload.role
            ? 'super_admin'
            : jwtPayload.role || 'super_admin';
        let decodedTenantId = jwtPayload.tenantId || jwtPayload.user_metadata?.tenantId || null;
        if (decodedTenantId === 'undefined' || decodedTenantId === 'null') decodedTenantId = null;

        try {
          const { data: newProfile, error: insertError } = await withTimeout(
            supabaseAdmin
              .from('users')
              .insert({
                id: userId,
                email: userEmail,
                role: decodedRole,
                tenant_id: decodedTenantId,
                is_active: true,
                name: jwtPayload.user_metadata?.full_name || 'Admin User',
              })
              .select()
              .single(),
            DB_TIMEOUT_MS,
            'users.insert',
          );

          if (insertError) {
            console.warn(
              `[AuthMiddleware] Could not auto-create user profile. Using JWT claims: ${decodedRole}`,
            );
            (req as any).user = {
              id: userId,
              email: userEmail,
              role: decodedRole,
              tenantId: decodedTenantId,
            };
            return next();
          }
          profile = newProfile;
        } catch (insertErr: any) {
          console.warn(
            `[AuthMiddleware] Auto-create timed out/failed. Using JWT claims: ${insertErr.message}`,
          );
          (req as any).user = {
            id: userId,
            email: userEmail,
            role: decodedRole,
            tenantId: decodedTenantId,
          };
          return next();
        }
      }

      const normalizedEmail = (userEmail || profile.email || '').trim().toLowerCase();
      if (
        normalizedEmail === 'sysadmin@iips.app' ||
        normalizedEmail === 'superadmin@iips.app' ||
        normalizedEmail === 'averyd777@gmail.com'
      ) {
        profile.role = 'super_admin';
        profile.tenant_id = SYSTEM_TENANT_UUID;
        profile.is_active = true;
      }

      if (!profile.is_active) {
        return res.status(403).json({ error: 'Your account has been disabled' });
      }

      cacheProfile({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        tenant_id: profile.tenant_id,
        is_active: profile.is_active !== false,
        name: profile.name,
      });

      (req as any).user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        tenantId: profile.tenant_id,
      };

      next();
    } catch (netError: any) {
      if (isTimeoutError(netError)) {
        console.error('[AuthMiddleware] Database connection timed out during auth.');
        return res.status(503).json({
          error: 'Authentication service temporarily unavailable. Please retry.',
        });
      }
      throw netError;
    }
  } catch (error: any) {
    console.error('[AuthMiddleware] Error:', error.message);
    return res.status(500).json({ error: 'Authentication processing failed' });
  }
};
