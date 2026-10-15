// invify-backend/src/modules/health-insurance/controllers/health-platform.controller.ts
import { Request, Response } from 'express';
import { HealthPlatformService } from '../services/health-platform.service';
import { supabaseAdmin } from '../../../db/supabase';

export class HealthPlatformController {
  // ─── 1. Cross-Tenant Overview ──────────────────────────────────────
  static async getOverview(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.getPlatformOverview(req.healthContext!);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to load platform overview' } });
    }
  }

  // ─── 2. Tenant Participation Directory ─────────────────────────────
  static async listTenants(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.listPlatformTenants(req.healthContext!, req.query);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to list participating tenants' } });
    }
  }

  // ─── 3. Provider Integration & Telemetry Health ───────────────────
  static async getProvidersHealth(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.getProvidersHealth(req.healthContext!);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to get provider health telemetry' } });
    }
  }

  // ─── 4. Coverage Trends & Analytics ────────────────────────────────
  static async getCoverageTrends(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.getCoverageTrends(req.healthContext!);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to get coverage trends' } });
    }
  }

  // ─── 5. Platform Grants Manager ────────────────────────────────────
  static async listGrants(req: Request, res: Response) {
    try {
      const statusFilter = req.query.status as string;
      const data = await HealthPlatformService.listPlatformGrants(req.healthContext!, statusFilter);
      return res.status(200).json({ grants: data });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to list grants' } });
    }
  }

  static async createGrant(req: Request, res: Response) {
    try {
      const actorUserId = req.healthContext?.userId || (req as any).user?.id;
      const { userId, permission, durationMinutes, reason } = req.body;
      const grant = await HealthPlatformService.createPlatformGrant(actorUserId, {
        userId,
        permission,
        durationMinutes,
        reason
      });
      return res.status(201).json(grant);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message || 'Failed to create grant' } });
    }
  }

  static async revokeGrant(req: Request, res: Response) {
    try {
      const actorUserId = req.healthContext?.userId || (req as any).user?.id;
      const grantId = req.params.id;
      const { reason } = req.body;
      const data = await HealthPlatformService.revokePlatformGrant(actorUserId, grantId, reason);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message || 'Failed to revoke grant' } });
    }
  }

  // ─── 6. Platform Audit Events ──────────────────────────────────────
  static async listAuditEvents(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.listPlatformAuditEvents(req.healthContext!, req.query);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to list audit events' } });
    }
  }

  // ─── 7. Self Grant Status & Session Activation ─────────────────────
  static async getMyGrantStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

      const data = await HealthPlatformService.getOperatorGrantStatus(userId);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to check grant status' } });
    }
  }

  static async selfActivateGrant(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: 'Unauthenticated' });

      // Check if user is an active user with administrative role
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', user.id)
        .single();

      const userRole = String(dbUser?.role || '').toLowerCase();
      if (!dbUser || !['super_admin', 'admin_deploy'].includes(userRole)) {
        return res.status(403).json({
          error: { message: 'Only platform administrators (SUPER_ADMIN) may activate operational sessions' }
        });
      }

      const { reason, permission } = req.body;
      if (!reason || String(reason).trim().length < 5) {
        return res.status(400).json({
          error: { message: 'Operational justification reason (> 5 characters) is mandatory to activate a session' }
        });
      }

      const targetPermission = permission || 'platform.integration.health';

      // ─── STRICT DUAL-AUTHORIZATION ENFORCEMENT ───────────────────────
      // A caller cannot create, expand or approve their own privileged grants.
      // Operational-session activation strictly requires an existing unexpired,
      // unrevoked grant in hw_platform_grants that was issued by an INDEPENDENT administrator.
      const nowIso = new Date().toISOString();
      const { data: independentGrants, error: gErr } = await supabaseAdmin
        .from('hw_platform_grants')
        .select('id, user_id, permission, granted_by, granted_at, expires_at, revoked_at')
        .eq('user_id', dbUser.id)
        .eq('permission', targetPermission)
        .is('revoked_at', null)
        .gt('expires_at', nowIso)
        .neq('granted_by', dbUser.id); // Must be granted by an independent administrator

      if (gErr || !independentGrants || independentGrants.length === 0) {
        return res.status(403).json({
          error: {
            code: 'INDEPENDENT_AUTHORIZATION_REQUIRED',
            message: `Dual-authorization required: Operational session cannot be self-activated without a pre-existing grant for '${targetPermission}' approved by an independent platform administrator. Self-elevation is prohibited.`
          }
        });
      }

      const activeGrant = independentGrants[0];

      // Record immutable audit event for the operational session activation
      const { HealthAuditService } = await import('../services/health-audit.service');
      await HealthAuditService.recordEvent({
        tenantId: '00000000-0000-0000-0000-000000000000',
        actorUserId: dbUser.id,
        actorRole: userRole,
        action: 'platform.session.activated',
        resourceType: 'hw_platform_grants',
        resourceId: activeGrant.id,
        changes: {
          permission: targetPermission,
          reason,
          grantedBy: activeGrant.granted_by,
          activatedAt: nowIso
        },
        viaPlatformAccess: true,
        platformReason: reason
      });

      return res.status(200).json({
        success: true,
        message: 'Operational session activated under existing independent grant',
        session: {
          grantId: activeGrant.id,
          permission: activeGrant.permission,
          grantedBy: activeGrant.granted_by,
          expiresAt: activeGrant.expires_at,
          sessionReason: reason,
          activatedAt: nowIso
        }
      });
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message || 'Failed to activate session' } });
    }
  }
}
