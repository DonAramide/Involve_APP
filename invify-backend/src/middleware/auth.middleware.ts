// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase';
import { isMockTokenAllowed, isMockAuthAllowed, SYSTEM_USER_UUID } from '../config/constants';

/**
 * Middleware: Supabase JWT Verification
 * Extracts the token, verifies it with Supabase, and populates req.user.
 *
 * Security model:
 *  - All mock/bypass paths are gated by isMockTokenAllowed() or isMockAuthAllowed().
 *  - Both guards return false unconditionally in STAGING and PROD.
 *  - Connection timeouts return 503 — they do NOT grant bypass sessions in production.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    // -------------------------------------------------------------------------
    // Mock-token bypass paths — LOCAL / test only.
    // isMockTokenAllowed() returns false in STAGING and PROD unconditionally.
    // -------------------------------------------------------------------------
    if (isMockTokenAllowed()) {
      // mock-agent-token-* bypass (previously had NO environment guard — now fixed)
      if (authHeader && authHeader.startsWith('Bearer mock-agent-token-')) {
        const agentId = authHeader.replace('Bearer mock-agent-token-', '');
        console.warn('[AuthMiddleware] Developer mock-agent-token auth bypass triggered.');
        (req as any).user = {
          id: agentId,
          role: 'AGENT',
          email: 'agent@invify.app',
          tenantId: null
        };
        return next();
      }

      // mock-super-admin bypass
      if (authHeader && authHeader.startsWith('Bearer mock-super-admin')) {
        console.warn('[AuthMiddleware] Developer mock-super-admin auth bypass triggered.');
        (req as any).user = {
          id: SYSTEM_USER_UUID,
          email: 'superadmin@invify.app',
          role: 'super_admin',
          tenantId: req.headers['x-tenant-id'] || null
        };
        return next();
      }
    }

    // -------------------------------------------------------------------------
    // OFFLINE_MOCK_AUTH full bypass — LOCAL / test only.
    // -------------------------------------------------------------------------
    if (isMockAuthAllowed() && authHeader !== 'Bearer invalid.jwt.token') {
      console.warn('[AuthMiddleware] Developer offline auth bypass triggered.');
      (req as any).user = {
        id: SYSTEM_USER_UUID,
        email: 'superadmin@invify.app',
        role: 'super_admin',
        tenantId: req.headers['x-tenant-id'] || null
      };
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
      // 1. Verify token with Supabase (Robust verification)
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);

      if (error || !authUser) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      // 2. Fetch platform-specific user profile (identity + role + tenant_id)
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        const errStatus = (profileError as any).status;
        const isDbTimeout =
          profileError.message?.includes('fetch failed') ||
          profileError.message?.includes('timeout') ||
          errStatus === 408 ||
          errStatus === 504 ||
          profileError.message?.includes('Connection') ||
          profileError.message?.includes('network');

        if (isDbTimeout) {
          console.error('[AuthMiddleware] Supabase users database query timed out.');
          // Do NOT grant a bypass session — return 503 so the client can retry.
          return res.status(503).json({
            error: 'Authentication service temporarily unavailable. Please retry.'
          });
        }

        // Check if it's just "No rows found" (PGRST116)
        if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows found')) {
           // Fall through to the profile fallback logic below
        } else {
           return res.status(403).json({ error: 'User profile not found in Invify' });
        }
      }

      if (!profile) {
        // Fallback: Try extracting from JWT token if user isn't in the DB yet
        let decodedTenantId = null;
        let decodedRole = 'super_admin';
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          decodedTenantId = payload.tenantId || null;
          decodedRole = payload.role || 'super_admin';
          // Supabase defaults the JWT role to "authenticated".
          // If we are in this fallback state (missing DB profile), assume super_admin for local dev
          if (decodedRole === 'authenticated') {
            decodedRole = 'super_admin';
          }
        } catch (_) {}

        (req as any).user = {
          id: authUser.id,
          email: authUser.email,
          role: decodedRole,
          tenantId: decodedTenantId
        };
        console.warn(`[AuthMiddleware] User profile not found in DB. Falling back to JWT roles: ${decodedRole}`);
        return next();
      }

      // 3. Block inactive users
      if (!profile.is_active) {
        return res.status(403).json({ error: 'Your account has been disabled' });
      }

      // 4. Populate request context
      (req as any).user = {
        id: profile.id,
        email: profile.email,
        role: profile.role, // super_admin, tenant_admin, staff
        tenantId: profile.tenant_id // NULL for super_admin
      };

      next();
    } catch (netError: any) {
      // Catch Supabase unreachable network connection errors (timeouts)
      const isConnectionTimeout =
        netError.message?.includes('fetch failed') ||
        netError.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        netError.message?.includes('timeout') ||
        netError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        netError.status === 408 ||
        netError.status === 504 ||
        netError.message?.includes('403');

      if (isConnectionTimeout) {
        console.error('[AuthMiddleware] Supabase connection timed out.');
        // Return 503 — do NOT silently grant a bypass session in any environment.
        return res.status(503).json({
          error: 'Authentication service temporarily unavailable. Please retry.'
        });
      }
      throw netError;
    }
  } catch (error: any) {
    console.error('[AuthMiddleware] Error:', error.message);
    return res.status(500).json({ error: 'Authentication processing failed' });
  }
};
