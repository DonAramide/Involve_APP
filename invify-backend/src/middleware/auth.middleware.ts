// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { isMockTokenAllowed, isMockAuthAllowed, SYSTEM_USER_UUID } from '../config/constants';
import { BuildVariantService } from '../config/build-variant';
import { verifySupabaseAccessToken, verifyWithSharedSecrets, peekAlg, supabaseProjectUrl } from '../utils/supabase-jwt';

/**
 * Middleware: Supabase JWT Verification
 *
 * Security model (Phase 2 / Phase 4):
 *  - Staging/Production: JWT MUST be cryptographically verified (HS via SUPABASE_JWT_SECRET,
 *    ES/RS via project JWKS). Missing secret → 503 fail-closed for HS path; missing URL → 503 for JWKS.
 *  - LOCAL/test only: mock bypasses gated by isMockTokenAllowed / isMockAuthAllowed.
 *  - Never auto-elevate to super_admin.
 *  - Never trust email hardcodes for role elevation.
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

function requiresVerifiedJwt(): boolean {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.APP_ENV === 'production' ||
    process.env.BUILD_PROFILE === 'production'
  ) {
    return true;
  }
  const variant = BuildVariantService.getInstance();
  return variant.isStaging() || variant.isProd();
}

/** Least-privilege claims from JWT — never super_admin from absence of data. */
function claimsFromJwt(jwtPayload: any, userId: string, userEmail: string): CachedProfile {
  let role =
    jwtPayload.role === 'authenticated' || !jwtPayload.role
      ? jwtPayload.app_metadata?.role ||
        jwtPayload.user_metadata?.role ||
        'owner'
      : jwtPayload.role;

  // Strip accidental privilege escalation from unverified claim shapes
  if (String(role).toLowerCase() === 'super_admin' && !jwtPayload.app_metadata?.role && !jwtPayload.user_metadata?.role) {
    // Only trust super_admin if explicitly set in app/user metadata from a verified token;
    // still prefer DB profile. For claim fallback use least privilege.
    role = 'owner';
  }

  let tenantId =
    jwtPayload.tenantId ||
    jwtPayload.tenant_id ||
    jwtPayload.app_metadata?.tenantId ||
    jwtPayload.app_metadata?.tenant_id ||
    jwtPayload.user_metadata?.tenantId ||
    jwtPayload.user_metadata?.tenant_id ||
    null;
  if (tenantId === 'undefined' || tenantId === 'null') tenantId = null;

  return {
    id: userId,
    email: userEmail,
    role: String(role || 'owner').toLowerCase() === 'super_admin' ? 'owner' : String(role || 'owner'),
    tenant_id: tenantId,
    is_active: true,
    name: jwtPayload.user_metadata?.full_name || 'User',
  };
}

async function verifyBearerToken(token: string): Promise<any> {
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
  const localJwtSecret = process.env.JWT_SECRET;

  if (requiresVerifiedJwt()) {
    // Staging/prod: asymmetric (ES256) via JWKS, or HS256 via legacy JWT secret.
    const alg = peekAlg(token);
    const isAsymmetric = alg.startsWith('ES') || alg.startsWith('RS') || alg.startsWith('PS');

    if (isAsymmetric) {
      const base = supabaseProjectUrl();
      if (!base) {
        const err: any = new Error('Authentication misconfigured: SUPABASE_URL required for asymmetric JWT');
        err.status = 503;
        err.code = 'JWT_JWKS_URL_MISSING';
        throw err;
      }
      return verifySupabaseAccessToken(token);
    } else {
      if (!supabaseJwtSecret || supabaseJwtSecret.length < 16) {
        const err: any = new Error('Authentication misconfigured: SUPABASE_JWT_SECRET required');
        err.status = 503;
        err.code = 'JWT_SECRET_MISSING';
        throw err;
      }
      return verifySupabaseAccessToken(token);
    }
  }

  // LOCAL / test: try Supabase verifier first (HS + JWKS), then JWT_SECRET for offline tokens
  try {
    return await verifySupabaseAccessToken(token);
  } catch (primary: any) {
    if (primary?.code === 'JWT_SECRET_MISSING' || primary?.code === 'JWT_JWKS_URL_MISSING') {
      // fall through to local secret
    } else if (!localJwtSecret) {
      throw primary;
    }
  }

  if (localJwtSecret && localJwtSecret.length >= 16) {
    try {
      return verifyWithSharedSecrets(token, [localJwtSecret]);
    } catch {
      const err: any = new Error('Invalid or expired token');
      err.status = 401;
      throw err;
    }
  }

  // LOCAL without secrets: still refuse decode-only (fail closed for forged tokens)
  const err: any = new Error('JWT verification secret not configured');
  err.status = 503;
  err.code = 'JWT_SECRET_MISSING';
  throw err;
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

      if (authHeader && (authHeader.startsWith('Bearer mock-super-admin') || authHeader === 'Bearer mock-admin-token')) {
        console.warn('[AuthMiddleware] Developer mock-super-admin auth bypass triggered.');
        (req as any).user = {
          id: SYSTEM_USER_UUID,
          email: 'superadmin@invify.app',
          role: 'super_admin',
          tenantId: null,
        };
        return next();
      }
    }

    // Offline blanket bypass ONLY when OFFLINE_LOCAL_AUTH=true AND local/test guards pass.
    // NODE_ENV=test alone must NOT accept arbitrary Bearer tokens.
    if (
      isMockAuthAllowed() &&
      process.env.OFFLINE_LOCAL_AUTH === 'true' &&
      authHeader &&
      authHeader.startsWith('Bearer ') &&
      authHeader !== 'Bearer invalid.jwt.token'
    ) {
      console.warn('[AuthMiddleware] Developer offline auth bypass triggered.');
      (req as any).user = {
        id: SYSTEM_USER_UUID,
        email: 'superadmin@invify.app',
        role: 'super_admin',
        tenantId: null,
      };
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Reject known unsigned / mock markers outside LOCAL mock gates
    if (token === 'mock-super-admin' || token.includes('local_dev_signature')) {
      if (!isMockTokenAllowed() && !isMockAuthAllowed()) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    try {
      let jwtPayload: any;
      try {
        jwtPayload = await verifyBearerToken(token);
      } catch (verifyErr: any) {
        const status = verifyErr.status || 401;
        return res.status(status).json({
          error: verifyErr.message || 'Invalid or expired token',
          code: verifyErr.code,
        });
      }

      const userId = jwtPayload.sub || jwtPayload.id;
      const userEmail = jwtPayload.email || jwtPayload.user_metadata?.email || '';
      if (!userId) {
        return res.status(401).json({ error: 'Token missing subject claim' });
      }

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
            `[AuthMiddleware] Supabase users database query timed out (${DB_TIMEOUT_MS}ms).`,
          );
        } else {
          throw err;
        }
      }

      // On DB timeout: least-privilege claim fallback ONLY in LOCAL; staging/prod fail closed
      if (dbTimedOut && !profile) {
        if (requiresVerifiedJwt()) {
          return res.status(503).json({
            error: 'Authentication service temporarily unavailable. Please retry.',
          });
        }
        const fallback = claimsFromJwt(jwtPayload, userId, userEmail);
        console.warn(
          `[AuthMiddleware] LOCAL JWT-claim fallback user=${fallback.id} role=${fallback.role} tenant=${fallback.tenant_id || 'n/a'}`,
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
          if (requiresVerifiedJwt()) {
            return res.status(503).json({
              error: 'Authentication service temporarily unavailable. Please retry.',
            });
          }
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

      // Missing profile: NEVER auto-create as super_admin. Reject or create least-privilege owner.
      if (!profile) {
        const leastRole = 'owner';
        let decodedTenantId =
          jwtPayload.tenantId ||
          jwtPayload.tenant_id ||
          jwtPayload.app_metadata?.tenantId ||
          jwtPayload.user_metadata?.tenantId ||
          null;
        if (decodedTenantId === 'undefined' || decodedTenantId === 'null') decodedTenantId = null;

        // Staging/prod: require explicit provisioning — do not auto-insert privileged users
        if (requiresVerifiedJwt()) {
          return res.status(403).json({
            error: 'User profile not provisioned in Invify. Contact an administrator.',
            code: 'PROFILE_NOT_PROVISIONED',
          });
        }

        try {
          const { data: newProfile, error: insertError } = await withTimeout(
            supabaseAdmin
              .from('users')
              .insert({
                id: userId,
                email: userEmail,
                role: leastRole,
                tenant_id: decodedTenantId,
                is_active: true,
                name: jwtPayload.user_metadata?.full_name || 'User',
              })
              .select()
              .single(),
            DB_TIMEOUT_MS,
            'users.insert',
          );

          if (insertError) {
            console.warn(
              `[AuthMiddleware] Could not auto-create user profile (least privilege). Rejecting.`,
            );
            return res.status(403).json({ error: 'User profile not found in Invify' });
          }
          profile = newProfile;
        } catch (insertErr: any) {
          console.warn(
            `[AuthMiddleware] Auto-create timed out/failed: ${insertErr.message}`,
          );
          return res.status(503).json({
            error: 'Authentication service temporarily unavailable. Please retry.',
          });
        }
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

export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    (req as any).user = null;
    return next();
  }
  try {
    let responded = false;
    const proxyRes: any = {
      status: (code: number) => {
        responded = true;
        return {
          json: () => {
            (req as any).user = null;
            return next();
          }
        };
      },
      json: () => {
        responded = true;
        (req as any).user = null;
        return next();
      }
    };
    await authenticate(req, proxyRes, (err?: any) => {
      if (responded) return;
      if (err) {
        (req as any).user = null;
      }
      return next();
    });
  } catch {
    (req as any).user = null;
    return next();
  }
};
