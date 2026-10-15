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

      // Check if user is a verified SUPER_ADMIN in the users table
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', user.id)
        .single();

      const userRole = String(dbUser?.role || '').toLowerCase();
      if (!dbUser || !['super_admin', 'admin_deploy'].includes(userRole)) {
        return res.status(403).json({
          error: { message: 'Only platform administrators (SUPER_ADMIN) may self-activate operational grants' }
        });
      }

      const { permission, durationMinutes, reason } = req.body;
      const grant = await HealthPlatformService.createPlatformGrant(dbUser.id, {
        userId: dbUser.id,
        permission: permission || 'platform.integration.health',
        durationMinutes: durationMinutes || 60,
        reason: reason || 'Platform super-admin operational session'
      });

      return res.status(201).json(grant);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message || 'Failed to activate grant' } });
    }
  }
}
