// src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';

const parseRoles = (roleData: any): string[] => {
  if (typeof roleData === 'string') {
    return roleData.split(',').map((r: string) => r.trim().toLowerCase());
  }
  if (Array.isArray(roleData)) {
    return roleData.map((r: string) => typeof r === 'string' ? r.toLowerCase() : '');
  }
  return [];
};

/**
 * Ensures the user has one of the allowed roles.
 */
export const checkRole = (allowedRoles: string[]) => {
  const allowedLower = allowedRoles.map(r => r.toLowerCase());
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    const userRoles = parseRoles(user.role);
    console.log(`[RBAC checkRole] Path: ${req.path}, User Roles: ${userRoles.join(',')}, Allowed Roles: ${allowedRoles.join(',')}`);

    // 1. Super Admin bypass
    if (userRoles.includes('super_admin')) {
      return next();
    }

    // 2. Map platform staff roles if route demands 'super_admin'
    // This allows specific platform staff roles to access administrative routes relevant to their function
    if (allowedLower.includes('super_admin')) {
      const path = req.path.toLowerCase();
      
      if (userRoles.includes('admin_deploy') || userRoles.includes('owner') || userRoles.includes('admin')) {
        // Platform operators: Release Channels, Global Settings, POS Switchboard
        if (path.startsWith('/admin/settings') || path.startsWith('/api/admin/apk') || path.startsWith('/admin/pos') || path.startsWith('/admin/commissions') || path.startsWith('/admin/tenants') || path.startsWith('/admin/users')) {
          return next();
        }
      }

      if (userRoles.includes('internal_staff')) {
        if (path.startsWith('/admin/users') || path.startsWith('/admin/tenants') || path.startsWith('/api/admin/audit')) {
          return next();
        }
      }
      
      if (userRoles.includes('admin_ops')) {
        // admin_ops has privilege "Reissue Cards, Fleet Management"
        if (path.startsWith('/api/admin/terminals') || path.startsWith('/api/admin/inventory') || path.startsWith('/devices')) {
          return next();
        }
      }
      
      if (userRoles.includes('admin_risk')) {
        // admin_risk has privilege "Freeze Wallets, Suspend Terminals"
        if (path.startsWith('/admin/audit-logs') || path.startsWith('/api/admin/terminals') || path.startsWith('/api/admin/inventory') || path.startsWith('/devices')) {
          return next();
        }
      }
      
      if (userRoles.includes('admin_executive')) {
        // admin_executive has privilege "Board View, Export Reports"
        if (path.startsWith('/admin/dashboard-stats') || path.startsWith('/admin/analytics') || path.startsWith('/api/finance/executive-summary')) {
          return next();
        }
      }
      
      if (userRoles.includes('admin_finance')) {
        // admin_finance has privilege "Read/Write Ledgers"
        if (path.startsWith('/admin/ledger') || path.startsWith('/admin/payments') || path.startsWith('/api/reconciliation') || path.startsWith('/api/finance/executive-summary')) {
          return next();
        }
      }

      if (userRoles.includes('admin_treasury')) {
        // admin_treasury has privilege "Batch Payouts, Wallet Adjustments"
        if (path.startsWith('/wallet') || path.startsWith('/api/payout') || path.startsWith('/api/finance/executive-summary')) {
          return next();
        }
      }
    }

    const hasAnyAllowedRole = userRoles.some(r => allowedLower.includes(r));
    if (!hasAnyAllowedRole) {
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

  const userRoles = parseRoles(user.role);

  // 1. Super Admin Bypass
  if (userRoles.includes('super_admin')) {
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

/**
 * Enforces fine-grained domain permissions for Tenant Users.
 */
export const checkTenantPermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    const userRoles = parseRoles(user.role);

    // 1. Super Admin Bypass
    if (userRoles.includes('super_admin')) {
      return next();
    }

    // 2. Tenant Admin / Owner Bypass
    if (userRoles.includes('tenant_admin') || userRoles.includes('owner')) {
      return next();
    }

    // 3. Admin Finance Bypass (Map admin_finance to reconciliation permissions)
    if (userRoles.includes('admin_finance') && requiredPermission.startsWith('reconciliation.')) {
      return next();
    }
    
    if (userRoles.includes('finance_staff') && requiredPermission.startsWith('reconciliation.')) {
        // finance_staff gets view/basic permissions but maybe not override.
        const basicReconPerms = ['reconciliation.view', 'reconciliation.assign', 'reconciliation.timeline.view', 'reconciliation.audit.view'];
        if (basicReconPerms.includes(requiredPermission)) {
            return next();
        }
    }

    // 4. Check explicit permissions array (assuming it exists on the JWT/User object)
    const userPermissions: string[] = user.permissions || [];
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ error: `Forbidden: Missing required permission: ${requiredPermission}` });
    }

    next();
  };
};
