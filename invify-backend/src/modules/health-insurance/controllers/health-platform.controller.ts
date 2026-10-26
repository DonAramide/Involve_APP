// invify-backend/src/modules/health-insurance/controllers/health-platform.controller.ts
import { Request, Response } from 'express';
import { HealthPlatformService } from '../services/health-platform.service';
import { PlatformEntitlementError, PlatformEntitlementService } from '../services/platform-entitlement.service';
import { HealthPlanGovernanceService } from '../services/health-plan-governance.service';
import { PlanDraftValidationError } from '../services/plan-draft.validation';
import { supabaseAdmin } from '../../../db/supabase';

function sendPlatformData(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function readPlatformReason(req: Request): string {
  const header = req.headers['x-platform-reason'];
  return typeof header === 'string' ? header.trim() : '';
}

async function mutateEntitlement(
  req: Request,
  res: Response,
  action: (actorUserId: string, permission: string, reason: string) => Promise<unknown>,
  successStatus = 200
) {
  try {
    const actorUserId = (req as any).user?.id;
    if (!actorUserId) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
    const reason = readPlatformReason(req);
    if (reason.length < 5) {
      return res.status(400).json({
        error: {
          code: 'PLATFORM_REASON_REQUIRED',
          message: 'Platform administrative access requires a valid x-platform-reason header (> 5 chars)'
        }
      });
    }
    const permission = String(req.params?.permission || req.body?.permission || '');
    const data = await action(actorUserId, permission, reason);
    return sendPlatformData(res, data, successStatus);
  } catch (err: any) {
    if (err instanceof PlatformEntitlementError) {
      return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    return res.status(400).json({ error: { message: err?.message || 'Failed to change platform entitlement' } });
  }
}

function sendPlanError(res: Response, err: any, fallback: string) {
  if (err instanceof PlanDraftValidationError) {
    return res.status(err.status).json({
      success: false,
      error: { message: err.message }
    });
  }
  return res.status(500).json({
    success: false,
    error: { message: err?.message || fallback }
  });
}

export class HealthPlatformController {
  // ─── 1. Cross-Tenant Overview ──────────────────────────────────────
  static async getOverview(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.getPlatformOverview(req.healthContext!);
      return sendPlatformData(res, data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to load platform overview' } });
    }
  }

  // ─── 2. Tenant Participation Directory ─────────────────────────────
  static async listTenants(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.listPlatformTenants(req.healthContext!, req.query);
      return sendPlatformData(res, data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to list participating tenants' } });
    }
  }

  // ─── 3. Provider Integration & Telemetry Health ───────────────────
  static async getProvidersHealth(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.getProvidersHealth(req.healthContext!);
      return sendPlatformData(res, data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to get provider health telemetry' } });
    }
  }

  // ─── 4. Coverage Trends & Analytics ────────────────────────────────
  static async getCoverageTrends(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.getCoverageTrends(req.healthContext!);
      return sendPlatformData(res, data);
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to get coverage trends' } });
    }
  }

  // ─── 5. Platform Grants Manager ────────────────────────────────────
  static async listGrantOperators(req: Request, res: Response) {
    try {
      const actorUserId = (req as any).user?.id;
      if (!actorUserId) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      const operators = await HealthPlatformService.listGrantOperators(actorUserId);
      return sendPlatformData(res, { operators });
    } catch (err: any) {
      const status = err?.status === 403 ? 403 : 500;
      return res.status(status).json({
        error: { code: err?.code, message: err?.message || 'Failed to list administrators' }
      });
    }
  }

  static async listGrants(req: Request, res: Response) {
    try {
      const statusFilter = req.query.status as string;
      const data = await HealthPlatformService.listPlatformGrants(req.healthContext!, statusFilter);
      return sendPlatformData(res, { grants: data });
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
      return sendPlatformData(res, grant, 201);
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
      return sendPlatformData(res, data);
    } catch (err: any) {
      return res.status(400).json({ error: { message: err?.message || 'Failed to revoke grant' } });
    }
  }

  // ─── 6. Platform Audit Events ──────────────────────────────────────
  static async listAuditEvents(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.listPlatformAuditEvents(req.healthContext!, req.query);
      return sendPlatformData(res, data);
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
      return sendPlatformData(res, {
        hasActiveGrant: data.hasActiveGrants,
        hasActiveGrants: data.hasActiveGrants,
        activeGrants: data.activeGrants,
        inactiveGrants: data.inactiveGrants,
        durableEntitlements: data.durableEntitlements
      });
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

      if (gErr) {
        return res.status(503).json({
          error: {
            code: 'PLATFORM_GRANT_LOOKUP_FAILED',
            message: 'Platform grant lookup failed. The session was not activated.'
          }
        });
      }

      let activeEntitlement: { id: string; permission: string; granted_by: string } | null = null;
      if (!independentGrants || independentGrants.length === 0) {
        const { data: entitlement, error: entitlementError } = await supabaseAdmin
          .from('hw_platform_entitlements')
          .select('id, user_id, permission, granted_by, suspended_at, revoked_at')
          .eq('user_id', dbUser.id)
          .eq('permission', targetPermission)
          .is('revoked_at', null)
          .is('suspended_at', null)
          .neq('granted_by', dbUser.id)
          .maybeSingle();

        if (entitlementError) {
          return res.status(503).json({
            error: {
              code: 'PLATFORM_GRANT_LOOKUP_FAILED',
              message: 'Platform entitlement lookup failed. The session was not activated.'
            }
          });
        }

        const usable = entitlement
          && entitlement.user_id === dbUser.id
          && entitlement.granted_by
          && entitlement.granted_by !== dbUser.id
          && !entitlement.suspended_at
          && !entitlement.revoked_at;
        if (!usable) {
          return res.status(403).json({
            error: {
              code: 'INDEPENDENT_AUTHORIZATION_REQUIRED',
              message: `Dual-authorization required: Operational session cannot be self-activated without a pre-existing grant or active entitlement for '${targetPermission}' approved by an independent platform administrator. Self-elevation is prohibited.`
            }
          });
        }
        activeEntitlement = entitlement;
      }

      if (activeEntitlement) {
        const { HealthAuditService } = await import('../services/health-audit.service');
        await HealthAuditService.recordEvent({
          tenantId: '00000000-0000-0000-0000-000000000000',
          actorUserId: dbUser.id,
          actorRole: userRole,
          action: 'platform.session.activated',
          resourceType: 'hw_platform_entitlements',
          resourceId: activeEntitlement.id,
          changes: {
            permission: targetPermission,
            reason,
            grantedBy: activeEntitlement.granted_by,
            activatedAt: nowIso
          },
          viaPlatformAccess: true,
          platformReason: reason
        });

        return res.status(200).json({
          success: true,
          message: 'Operational session activated under an existing independent entitlement. No grant was created.',
          session: {
            entitlementId: activeEntitlement.id,
            permission: activeEntitlement.permission,
            grantedBy: activeEntitlement.granted_by,
            sessionReason: reason,
            activatedAt: nowIso
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

  static async listPlanCatalogue(req: Request, res: Response) {
    try {
      const data = await HealthPlanGovernanceService.listCatalogue();
      return sendPlatformData(res, data);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err?.message || 'Failed to list the plan catalogue' } });
    }
  }

  static async createPlanDraft(req: Request, res: Response) {
    try {
      const data = await HealthPlanGovernanceService.createDraft(req.healthContext!, req.body || {});
      return sendPlatformData(res, data, 201);
    } catch (err: any) {
      return sendPlanError(res, err, 'Failed to save plan draft');
    }
  }

  static async publishPlanVersion(req: Request, res: Response) {
    try {
      const data = await HealthPlanGovernanceService.publishVersion(req.healthContext!, req.params.versionId, req.body || {});
      return sendPlatformData(res, data);
    } catch (err: any) {
      return sendPlanError(res, err, 'Failed to publish plan version');
    }
  }

  static async activatePlan(req: Request, res: Response) {
    try {
      const data = await HealthPlanGovernanceService.activatePlan(req.healthContext!, req.params.planId, req.body || {});
      return sendPlatformData(res, data);
    } catch (err: any) {
      return sendPlanError(res, err, 'Failed to activate plan');
    }
  }

  static async retirePlan(req: Request, res: Response) {
    try {
      const data = await HealthPlanGovernanceService.retirePlan(req.healthContext!, req.params.planId, req.body || {});
      return sendPlatformData(res, data);
    } catch (err: any) {
      return sendPlanError(res, err, 'Failed to retire plan');
    }
  }

  static async updatePlanDraft(req: Request, res: Response) {
    try {
      const data = await HealthPlanGovernanceService.updateDraftVersion(req.healthContext!, req.params.versionId, req.body || {});
      return sendPlatformData(res, data);
    } catch (err: any) {
      return sendPlanError(res, err, 'Failed to update plan draft');
    }
  }

  static async issueEntitlement(req: Request, res: Response) {
    return mutateEntitlement(req, res, (actorUserId, permission, reason) =>
      PlatformEntitlementService.issue(actorUserId, permission, reason, req.body?.userId), 201);
  }

  static async suspendEntitlement(req: Request, res: Response) {
    return mutateEntitlement(req, res, (actorUserId, permission, reason) =>
      PlatformEntitlementService.suspend(actorUserId, permission, reason)
    );
  }

  static async revokeEntitlement(req: Request, res: Response) {
    return mutateEntitlement(req, res, (actorUserId, permission, reason) =>
      PlatformEntitlementService.revoke(actorUserId, permission, reason)
    );
  }

  static async listProviderRegistry(_req: Request, res: Response) {
    try {
      const providers = await HealthPlatformService.listProviderRegistry();
      return sendPlatformData(res, { providers });
    } catch (err: any) {
      return res.status(500).json({ error: { message: err?.message || 'Failed to list HMO registry' } });
    }
  }

  static async getFinanceSnapshot(req: Request, res: Response) {
    try {
      const data = await HealthPlatformService.getFinanceSnapshot();
      return sendPlatformData(res, data);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err?.message || 'Failed to summarise premiums' } });
    }
  }

  static async listFacilities(req: Request, res: Response) {
    try {
      const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined;
      const data = await HealthPlatformService.listFacilities(providerId);
      return sendPlatformData(res, { facilities: data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: { message: err?.message || 'Failed to list facilities' } });
    }
  }
}
