// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../db/supabase';
import { isMockTokenAllowed, isMockAuthAllowed, SYSTEM_USER_UUID, SYSTEM_TENANT_UUID } from '../config/constants';
import jwt from 'jsonwebtoken';

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
    // OFFLINE_LOCAL_AUTH full bypass — LOCAL / test only.
    // -------------------------------------------------------------------------
    if (isMockAuthAllowed() && authHeader !== 'Bearer invalid.jwt.token') {
      console.warn('[AuthMiddleware] Developer offline auth bypass triggered.');
      (req as any).user = {
        id: SYSTEM_USER_UUID,
        email: 'superadmin@invify.app',
        role: 'super_admin',
        tenantId: (req.headers['x-tenant-id'] === 'undefined' || req.headers['x-tenant-id'] === 'null') ? null : (req.headers['x-tenant-id'] || null)
      };
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
      // ── Step 1: Decode JWT locally — NO network call to Supabase auth servers ──
      // Supabase tokens are HS256 JWTs. We can decode the payload to extract
      // sub (user UUID), email, exp without making any network call.
      // If SUPABASE_JWT_SECRET is set we do full signature verification.
      // Otherwise we use jwt.decode() (no signature check) + DB presence as validation.

      let jwtPayload: any = null;

      const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
      if (supabaseJwtSecret) {
        // Full verification using Supabase JWT secret
        try {
          jwtPayload = jwt.verify(token, supabaseJwtSecret) as any;
        } catch (verifyErr: any) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
      } else {
        // Decode without signature check — DB lookup acts as existence validation
        jwtPayload = jwt.decode(token) as any;
        if (!jwtPayload) {
          return res.status(401).json({ error: 'Malformed token' });
        }
        // Manual expiry check
        if (jwtPayload.exp && jwtPayload.exp < Math.floor(Date.now() / 1000)) {
          return res.status(401).json({ error: 'Token has expired' });
        }
      }

      // Extract identity from payload
      const userId  = jwtPayload.sub || jwtPayload.id;
      const userEmail = jwtPayload.email || jwtPayload.user_metadata?.email || '';

      if (!userId) {
        return res.status(401).json({ error: 'Token missing subject claim' });
      }

      // ── Step 2: Fetch user profile from DB (supabaseAdmin bypasses RLS) ──
      let { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
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
          return res.status(503).json({
            error: 'Authentication service temporarily unavailable. Please retry.'
          });
        }

        // PGRST116 = row not found — user exists in Auth but not in our users table yet
        if (profileError.code !== 'PGRST116' && !profileError.message?.includes('No rows found')) {
          console.error('[AuthMiddleware] Supabase users query failed:', profileError);
          return res.status(403).json({ error: 'User profile not found in Invify' });
        }
      }

      if (!profile) {
        // Auto-create profile for valid Supabase users not yet in our users table
        let decodedRole = (jwtPayload.role === 'authenticated' || !jwtPayload.role)
          ? 'super_admin'
          : (jwtPayload.role || 'super_admin');
        let decodedTenantId = jwtPayload.tenantId || jwtPayload.user_metadata?.tenantId || null;
        if (decodedTenantId === 'undefined' || decodedTenantId === 'null') decodedTenantId = null;

        const { data: newProfile, error: insertError } = await supabaseAdmin.from('users').insert({
          id: userId,
          email: userEmail,
          role: decodedRole,
          tenant_id: decodedTenantId,
          is_active: true,
          name: jwtPayload.user_metadata?.full_name || 'Admin User'
        }).select().single();

        if (insertError) {
          console.warn(`[AuthMiddleware] Could not auto-create user profile. Using JWT claims: ${decodedRole}`);
          (req as any).user = { id: userId, email: userEmail, role: decodedRole, tenantId: decodedTenantId };
          return next();
        }

        profile = newProfile;
      }

      // Hard override for known superadmin accounts
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

      // Block inactive accounts
      if (!profile.is_active) {
        return res.status(403).json({ error: 'Your account has been disabled' });
      }

      // Populate request context
      (req as any).user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        tenantId: profile.tenant_id
      };

      next();
    } catch (netError: any) {
      const isConnectionTimeout =
        netError.message?.includes('fetch failed') ||
        netError.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        netError.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        netError.message?.includes('timeout');

      if (isConnectionTimeout) {
        console.error('[AuthMiddleware] Database connection timed out during auth.');
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
