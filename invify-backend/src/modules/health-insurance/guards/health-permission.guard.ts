// invify-backend/src/modules/health-insurance/guards/health-permission.guard.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../../db/supabase';
import { HealthPermission, PlatformHealthPermission, HealthContext } from '../types';

declare global {
  namespace Express {
    interface Request {
      healthContext?: HealthContext;
    }
  }
}

/**
 * Enforces explicit Health permissions.
 * CRITICAL RULE: Super Admin does NOT automatically bypass health permissions.
 * Platform staff require an unexpired hw_platform_grants row or an active
 * hw_platform_entitlements row, plus an audited x-platform-reason.
 * A grant lookup failure or an entitlement lookup failure does not authorize.
 */
export function requireHealthPermission(requiredPermission: HealthPermission | PlatformHealthPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required for Health & Wellness access'
          }
        });
      }

      // 1. Authoritative DB profile check via service role
      const { data: dbUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, role, tenant_id, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (userError || !dbUser) {
        return res.status(403).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile could not be validated'
          }
        });
      }

      if (!dbUser.is_active) {
        return res.status(403).json({
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'User account is disabled'
          }
        });
      }

      // 2. Platform Operator Flow (Platform Grants)
      const isPlatformPermission = String(requiredPermission).startsWith('platform.');
      if (isPlatformPermission) {
        const { data: platformGrant, error: grantError } = await supabaseAdmin
          .from('hw_platform_grants')
          .select('id, expires_at, revoked_at')
          .eq('user_id', dbUser.id)
          .eq('permission', requiredPermission)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (grantError) {
          return res.status(503).json({
            error: {
              code: 'PLATFORM_GRANT_LOOKUP_FAILED',
              message: 'Platform grant lookup failed. Access was not granted.'
            }
          });
        }

        let platformEntitlement: { id?: string; user_id?: string; granted_by?: string; suspended_at?: string | null; revoked_at?: string | null } | null = null;
        if (!platformGrant) {
          const { data: entitlementRow, error: entitlementError } = await supabaseAdmin
            .from('hw_platform_entitlements')
            .select('id, user_id, permission, granted_by, suspended_at, revoked_at')
            .eq('user_id', dbUser.id)
            .eq('permission', requiredPermission)
            .is('revoked_at', null)
            .is('suspended_at', null)
            .maybeSingle();

          if (entitlementError) {
            return res.status(503).json({
              error: {
                code: 'PLATFORM_GRANT_LOOKUP_FAILED',
                message: 'Platform entitlement lookup failed. Access was not granted.'
              }
            });
          }

          const rowMatchesCaller = entitlementRow
            && entitlementRow.user_id === dbUser.id
            && entitlementRow.granted_by
            && entitlementRow.granted_by !== dbUser.id
            && !entitlementRow.suspended_at
            && !entitlementRow.revoked_at;
          platformEntitlement = rowMatchesCaller ? entitlementRow : null;
        }

        if (!platformGrant && !platformEntitlement) {
          return res.status(403).json({
            error: {
              code: 'PLATFORM_PERMISSION_DENIED',
              message: `An unexpired platform grant or an active platform entitlement is required for '${requiredPermission}'`
            }
          });
        }

        const platformReason = req.headers['x-platform-reason'] as string;
        if (!platformReason || platformReason.trim().length < 5) {
          return res.status(400).json({
            error: {
              code: 'PLATFORM_REASON_REQUIRED',
              message: 'Platform administrative access requires a valid x-platform-reason header (> 5 chars)'
            }
          });
        }

        req.healthContext = {
          tenantId: req.params?.tenantId || (req.query?.tenantId as string) || '',
          userId: dbUser.id,
          userEmail: dbUser.email,
          permissions: [requiredPermission],
          isPlatformOperator: true,
          isGuardian: false,
          platformReason
        };

        return next();
      }

      // 3. Tenant User Flow
      // Resolve tenant ID strictly from DB user profile
      const userTenantId = dbUser.tenant_id;
      if (!userTenantId) {
        // User may be a guardian without tenant association
        return res.status(403).json({
          error: {
            code: 'TENANT_ASSOCIATION_REQUIRED',
            message: 'User has no verified tenant association for this administrative action'
          }
        });
      }

      // 4. Query active grants in hw_permission_grants
      const { data: grants, error: grantsError } = await supabaseAdmin
        .from('hw_permission_grants')
        .select('permission')
        .eq('tenant_id', userTenantId)
        .eq('user_id', dbUser.id)
        .is('revoked_at', null);

      const activePerms = (grants || []).map((g: any) => g.permission);

      // Auto-seed standard permissions for tenant OWNER or TENANT_ADMIN if not yet seeded
      const legacyRole = String(dbUser.role || '').toLowerCase();
      const isTenantAdmin = ['owner', 'tenant_admin'].includes(legacyRole);
      
      const hasPermission = activePerms.includes(requiredPermission) || 
        (isTenantAdmin && requiredPermission !== 'health.hr_admin'); // HR admin is never auto-granted

      if (!hasPermission) {
        return res.status(403).json({
          error: {
            code: 'HEALTH_FORBIDDEN',
            message: `User lacks required health permission '${requiredPermission}'`
          }
        });
      }

      req.healthContext = {
        tenantId: userTenantId,
        userId: dbUser.id,
        userEmail: dbUser.email,
        permissions: isTenantAdmin ? [...activePerms, requiredPermission] : activePerms,
        isPlatformOperator: false,
        isGuardian: false
      };

      next();
    } catch (err: any) {
      console.error('[HealthPermissionGuard] Exception:', err?.message || err);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_AUTH_ERROR',
          message: 'An error occurred during health authorization check'
        }
      });
    }
  };
}
