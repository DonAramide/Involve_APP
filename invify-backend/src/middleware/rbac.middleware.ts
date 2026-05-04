// src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Ensures the user has one of the allowed roles.
 */
export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: `Forbidden: Requires ${allowedRoles.join(' or ')} role` });
    }

    next();
  };
};

/**
 * Enforces Tenant Isolation.
 * Rule: Super Admin can access everything. 
 * Tenant Admin/Staff can only access their specific tenant.
 */
export const checkTenantAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });

  // 1. Super Admin Bypass
  if (user.role === 'super_admin') {
    return next();
  }

  // 2. Extract TenantId from Request (Check Params first, then Query, then Body)
  const targetTenantId = req.params.tenantId || req.query.tenantId || req.body.tenantId;

  if (!targetTenantId) {
    // If no specific tenant is targetted, default to the user's tenant context
    (req as any).effectiveTenantId = user.tenantId;
    return next();
  }

  // 3. Strict Comparison
  if (user.tenantId !== targetTenantId) {
    return res.status(403).json({ error: 'Forbidden: Cross-tenant access denied' });
  }

  (req as any).effectiveTenantId = user.tenantId;
  next();
};
