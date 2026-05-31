// src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Ensures the user has one of the allowed roles.
 */
export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    // 1. Super Admin bypass
    if (user.role === 'super_admin') {
      return next();
    }

    // 2. Map platform staff roles if route demands 'super_admin'
    // This allows specific platform staff roles to access administrative routes relevant to their function
    if (allowedRoles.includes('super_admin')) {
      const platformRole = user.role;
      const path = req.path.toLowerCase();
      
      if (platformRole === 'admin_deploy') {
        // admin_deploy has privilege "Release Channels, Global Settings"
        // Allowed: IT & Deployments, settings
        if (path.startsWith('/admin/settings') || path.startsWith('/api/admin/apk') || path.startsWith('/admin/pos/routing') || path.startsWith('/admin/pos/kimono-params')) {
          return next();
        }
      }
      
      if (platformRole === 'admin_ops') {
        // admin_ops has privilege "Reissue Cards, Fleet Management"
        // Allowed: Terminals, inventory, active activations
        if (path.startsWith('/api/admin/terminals') || path.startsWith('/api/admin/inventory') || path.startsWith('/devices')) {
          return next();
        }
      }
      
      if (platformRole === 'admin_risk') {
        // admin_risk has privilege "Freeze Wallets, Suspend Terminals"
        // Allowed: Fraud, audit logs, quarantine
        if (path.startsWith('/admin/audit-logs') || path.startsWith('/api/admin/terminals') || path.startsWith('/api/admin/inventory') || path.startsWith('/devices')) {
          return next();
        }
      }
      
      if (platformRole === 'admin_executive') {
        // admin_executive has privilege "Board View, Export Reports"
        // Allowed: dashboard-stats, analytics, finance summary
        if (path.startsWith('/admin/dashboard-stats') || path.startsWith('/admin/analytics') || path.startsWith('/api/finance/executive-summary')) {
          return next();
        }
      }
      
      if (platformRole === 'admin_finance') {
        // admin_finance has privilege "Read/Write Ledgers"
        // Allowed: ledger, reconciliation, revenue, executive-summary
        if (path.startsWith('/admin/ledger') || path.startsWith('/admin/payments') || path.startsWith('/api/reconciliation') || path.startsWith('/api/finance/executive-summary')) {
          return next();
        }
      }

      if (platformRole === 'admin_treasury') {
        // admin_treasury has privilege "Batch Payouts, Wallet Adjustments"
        // Allowed: wallet, settlements, payouts
        if (path.startsWith('/wallet') || path.startsWith('/api/payout') || path.startsWith('/api/finance/executive-summary')) {
          return next();
        }
      }
    }

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
