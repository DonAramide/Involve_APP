// Attaches HealthContext for authenticated tenant users and verified guardians.
// Used by read endpoints that must work for mobile parents (not only settings.manage).
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../../db/supabase';

function headerTenantId(req: Request): string | null {
  const raw =
    (req.headers['x-tenant-id'] as string | undefined) ||
    (req.headers['X-Tenant-ID'] as string | undefined) ||
    '';
  const value = String(raw || '').trim();
  return value || null;
}

export function requireHealthTenantContext() {
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

      const { data: dbUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, role, tenant_id, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (userError || !dbUser) {
        return res.status(403).json({
          error: { code: 'USER_NOT_FOUND', message: 'User profile could not be validated' }
        });
      }

      if (!dbUser.is_active) {
        return res.status(403).json({
          error: { code: 'ACCOUNT_DISABLED', message: 'User account is disabled' }
        });
      }

      const preferredTenantId = headerTenantId(req);
      let tenantId: string | null = dbUser.tenant_id || null;
      let isGuardian = false;
      let guardianStudentIds: string[] | undefined;
      let permissions: string[] = [];

      if (tenantId) {
        if (preferredTenantId && preferredTenantId !== tenantId) {
          return res.status(403).json({
            error: {
              code: 'TENANT_ACCESS_DENIED',
              message: 'Requested tenant does not match the authenticated user'
            }
          });
        }

        const legacyRole = String(dbUser.role || '').toLowerCase();
        const isTenantAdmin = ['owner', 'tenant_admin'].includes(legacyRole);
        const { data: grants } = await supabaseAdmin
          .from('hw_permission_grants')
          .select('permission')
          .eq('tenant_id', tenantId)
          .eq('user_id', dbUser.id)
          .is('revoked_at', null);
        permissions = (grants || []).map((g: any) => String(g.permission));
        if (isTenantAdmin) {
          permissions = Array.from(
            new Set([...permissions, 'health.settings.manage', 'health.reports.read', 'health.members.read'])
          );
        }
      } else {
        const { data: links } = await supabaseAdmin
          .from('hw_guardian_links')
          .select('tenant_id, student_id, status')
          .eq('guardian_user_id', dbUser.id)
          .eq('status', 'verified');

        const verified = (links || []).filter((row: any) => row.tenant_id);
        if (verified.length === 0) {
          const claimTenant =
            (user as any).tenantId ||
            (user as any).tenant_id ||
            preferredTenantId ||
            null;
          if (!claimTenant) {
            return res.status(403).json({
              error: {
                code: 'TENANT_ASSOCIATION_REQUIRED',
                message: 'User has no tenant association for Health & Wellness'
              }
            });
          }
          tenantId = String(claimTenant);
        } else {
          const match = preferredTenantId
            ? verified.find((row: any) => String(row.tenant_id) === preferredTenantId)
            : verified[0];
          if (!match) {
            return res.status(403).json({
              error: {
                code: 'TENANT_ACCESS_DENIED',
                message: 'No verified guardian link for the requested tenant'
              }
            });
          }
          tenantId = String(match.tenant_id);
          isGuardian = true;
          guardianStudentIds = verified
            .filter((row: any) => String(row.tenant_id) === tenantId)
            .map((row: any) => String(row.student_id))
            .filter(Boolean);
          permissions = ['guardian.access'];
        }
      }

      req.healthContext = {
        tenantId: tenantId!,
        userId: dbUser.id,
        userEmail: dbUser.email,
        permissions,
        isPlatformOperator: false,
        isGuardian,
        guardianStudentIds
      };

      return next();
    } catch (err: any) {
      console.error('[HealthTenantContextGuard] Exception:', err?.message || err);
      return res.status(500).json({
        error: { code: 'INTERNAL_AUTH_ERROR', message: 'Failed to resolve health tenant context' }
      });
    }
  };
}
