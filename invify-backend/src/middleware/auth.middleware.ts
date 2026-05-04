// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase';

/**
 * Middleware: Supabase JWT Verification
 * Extracts the token, verifies it with Supabase, and populates req.user
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

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

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found in Invify' });
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
  } catch (error: any) {
    console.error('[AuthMiddleware] Error:', error.message);
    return res.status(500).json({ error: 'Authentication processing failed' });
  }
};
