"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthPlatformController = void 0;
const health_platform_service_1 = require("../services/health-platform.service");
const platform_entitlement_service_1 = require("../services/platform-entitlement.service");
const health_plan_governance_service_1 = require("../services/health-plan-governance.service");
const plan_draft_validation_1 = require("../services/plan-draft.validation");
const invify_catalogue_service_1 = require("../services/invify-catalogue.service");
const invify_catalogue_rules_1 = require("../services/invify-catalogue.rules");
const supabase_1 = require("../../../db/supabase");
function sendPlatformData(res, data, status = 200) {
    return res.status(status).json({ success: true, data });
}
function readPlatformReason(req) {
    const header = req.headers['x-platform-reason'];
    return typeof header === 'string' ? header.trim() : '';
}
async function mutateEntitlement(req, res, action, successStatus = 200) {
    try {
        const actorUserId = req.user?.id;
        if (!actorUserId)
            return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
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
    }
    catch (err) {
        if (err instanceof platform_entitlement_service_1.PlatformEntitlementError) {
            return res.status(err.status).json({ error: { code: err.code, message: err.message } });
        }
        return res.status(400).json({ error: { message: err?.message || 'Failed to change platform entitlement' } });
    }
}
function sendPlanError(res, err, fallback) {
    if (err instanceof plan_draft_validation_1.PlanDraftValidationError) {
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
function sendCatalogueError(res, err, fallback) {
    const safe = err instanceof invify_catalogue_rules_1.CatalogueValidationError ? err : (0, invify_catalogue_rules_1.clientSafeCatalogueError)(err, fallback);
    return res.status(safe.status).json({
        success: false,
        error: { code: safe.code, message: safe.message }
    });
}
class HealthPlatformController {
    // ─── 1. Cross-Tenant Overview ──────────────────────────────────────
    static async getOverview(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.getPlatformOverview(req.healthContext);
            return sendPlatformData(res, data);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message || 'Failed to load platform overview' } });
        }
    }
    // ─── 2. Tenant Participation Directory ─────────────────────────────
    static async listTenants(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.listPlatformTenants(req.healthContext, req.query);
            return sendPlatformData(res, data);
        }
        catch (err) {
            const message = err?.message || 'Failed to list participating tenants';
            const status = /mode must be|health must be/.test(message) ? 400 : 500;
            return res.status(status).json({ error: { message } });
        }
    }
    static async getTenantDetail(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.getTenantHealthDetail(String(req.params.tenantId || ''));
            return sendPlatformData(res, data);
        }
        catch (err) {
            const message = err?.message || 'Failed to load tenant health detail';
            const status = err?.status || (/UUID/.test(message) ? 400 : 500);
            return res.status(status).json({ error: { message } });
        }
    }
    static async getInstitutionDetail(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.getInstitutionHealthDetail(String(req.params.institutionId || ''));
            return sendPlatformData(res, data);
        }
        catch (err) {
            const message = err?.message || 'Failed to load institution health detail';
            const status = err?.status || 500;
            return res.status(status).json({ error: { message } });
        }
    }
    static async listMembers(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.listPlatformMembers(req.query);
            return sendPlatformData(res, data);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message || 'Failed to list members' } });
        }
    }
    static async setTenantParticipation(req, res) {
        try {
            if (typeof req.body?.enabled !== 'boolean') {
                return res.status(400).json({ error: { message: 'enabled must be true or false' } });
            }
            const data = await health_platform_service_1.HealthPlatformService.setTenantParticipation(req.healthContext, req.params.tenantId, req.body.enabled);
            return sendPlatformData(res, data);
        }
        catch (err) {
            const message = err?.message || 'Failed to update health access';
            const status = err?.status || (/UUID/.test(message) ? 400 : 500);
            return res.status(status).json({ error: { message } });
        }
    }
    // ─── 3. Provider Integration & Telemetry Health ───────────────────
    static async getProvidersHealth(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.getProvidersHealth(req.healthContext);
            return sendPlatformData(res, data);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message || 'Failed to get provider health telemetry' } });
        }
    }
    // ─── 4. Coverage Trends & Analytics ────────────────────────────────
    static async getCoverageTrends(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.getCoverageTrends(req.healthContext);
            return sendPlatformData(res, data);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message || 'Failed to get coverage trends' } });
        }
    }
    // ─── 5. Platform Grants Manager ────────────────────────────────────
    static async listGrantOperators(req, res) {
        try {
            const actorUserId = req.user?.id;
            if (!actorUserId)
                return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
            const operators = await health_platform_service_1.HealthPlatformService.listGrantOperators(actorUserId);
            return sendPlatformData(res, { operators });
        }
        catch (err) {
            const status = err?.status === 403 ? 403 : 500;
            return res.status(status).json({
                error: { code: err?.code, message: err?.message || 'Failed to list administrators' }
            });
        }
    }
    static async listGrants(req, res) {
        try {
            const statusFilter = req.query.status;
            const data = await health_platform_service_1.HealthPlatformService.listPlatformGrants(req.healthContext, statusFilter);
            return sendPlatformData(res, { grants: data });
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message || 'Failed to list grants' } });
        }
    }
    static async createGrant(req, res) {
        try {
            const actorUserId = req.healthContext?.userId || req.user?.id;
            const { userId, permission, durationMinutes, reason } = req.body;
            const grant = await health_platform_service_1.HealthPlatformService.createPlatformGrant(actorUserId, {
                userId,
                permission,
                durationMinutes,
                reason
            });
            return sendPlatformData(res, grant, 201);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message || 'Failed to create grant' } });
        }
    }
    static async revokeGrant(req, res) {
        try {
            const actorUserId = req.healthContext?.userId || req.user?.id;
            const grantId = req.params.id;
            const { reason } = req.body;
            const data = await health_platform_service_1.HealthPlatformService.revokePlatformGrant(actorUserId, grantId, reason);
            return sendPlatformData(res, data);
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message || 'Failed to revoke grant' } });
        }
    }
    // ─── 6. Platform Audit Events ──────────────────────────────────────
    static async listAuditEvents(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.listPlatformAuditEvents(req.healthContext, req.query);
            return sendPlatformData(res, data);
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message || 'Failed to list audit events' } });
        }
    }
    // ─── 7. Self Grant Status & Session Activation ─────────────────────
    static async getMyGrantStatus(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthenticated' });
            const data = await health_platform_service_1.HealthPlatformService.getOperatorGrantStatus(userId);
            return sendPlatformData(res, {
                hasActiveGrant: data.hasActiveGrants,
                hasActiveGrants: data.hasActiveGrants,
                activeGrants: data.activeGrants,
                inactiveGrants: data.inactiveGrants,
                durableEntitlements: data.durableEntitlements
            });
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message || 'Failed to check grant status' } });
        }
    }
    static async selfActivateGrant(req, res) {
        try {
            const user = req.user;
            if (!user)
                return res.status(401).json({ error: 'Unauthenticated' });
            // Check if user is an active user with administrative role
            const { data: dbUser } = await supabase_1.supabaseAdmin
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
            const { data: independentGrants, error: gErr } = await supabase_1.supabaseAdmin
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
            let activeEntitlement = null;
            if (!independentGrants || independentGrants.length === 0) {
                const { data: entitlement, error: entitlementError } = await supabase_1.supabaseAdmin
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
                const { HealthAuditService } = await Promise.resolve().then(() => __importStar(require('../services/health-audit.service')));
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
            const { HealthAuditService } = await Promise.resolve().then(() => __importStar(require('../services/health-audit.service')));
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
        }
        catch (err) {
            return res.status(400).json({ error: { message: err?.message || 'Failed to activate session' } });
        }
    }
    static async listPlanCatalogue(req, res) {
        try {
            const data = await health_plan_governance_service_1.HealthPlanGovernanceService.listCatalogue();
            return sendPlatformData(res, data);
        }
        catch (err) {
            return res.status(500).json({ success: false, error: { message: err?.message || 'Failed to list the plan catalogue' } });
        }
    }
    static async createPlanDraft(req, res) {
        try {
            const data = await health_plan_governance_service_1.HealthPlanGovernanceService.createDraft(req.healthContext, req.body || {});
            return sendPlatformData(res, data, 201);
        }
        catch (err) {
            return sendPlanError(res, err, 'Failed to save plan draft');
        }
    }
    static async publishPlanVersion(req, res) {
        try {
            const data = await health_plan_governance_service_1.HealthPlanGovernanceService.publishVersion(req.healthContext, req.params.versionId, req.body || {});
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendPlanError(res, err, 'Failed to publish plan version');
        }
    }
    static async activatePlan(req, res) {
        try {
            const data = await health_plan_governance_service_1.HealthPlanGovernanceService.activatePlan(req.healthContext, req.params.planId, req.body || {});
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendPlanError(res, err, 'Failed to activate plan');
        }
    }
    static async retirePlan(req, res) {
        try {
            const data = await health_plan_governance_service_1.HealthPlanGovernanceService.retirePlan(req.healthContext, req.params.planId, req.body || {});
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendPlanError(res, err, 'Failed to retire plan');
        }
    }
    static async updatePlanDraft(req, res) {
        try {
            const data = await health_plan_governance_service_1.HealthPlanGovernanceService.updateDraftVersion(req.healthContext, req.params.versionId, req.body || {});
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendPlanError(res, err, 'Failed to update plan draft');
        }
    }
    static async listCatalogueOfferings(req, res) {
        try {
            const data = await invify_catalogue_service_1.InvifyCatalogueService.listOfferings(req.query);
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendCatalogueError(res, err, 'Failed to list Invify catalogue offerings');
        }
    }
    static async getCatalogueOffering(req, res) {
        try {
            const data = await invify_catalogue_service_1.InvifyCatalogueService.getOfferingTree(req.params.offeringId);
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendCatalogueError(res, err, 'Failed to load offering');
        }
    }
    static async createCatalogueOffering(req, res) {
        try {
            const data = await invify_catalogue_service_1.InvifyCatalogueService.createOffering(req.healthContext, req.body || {});
            return sendPlatformData(res, data, 201);
        }
        catch (err) {
            return sendCatalogueError(res, err, 'Failed to create offering');
        }
    }
    static async updateCatalogueOffering(req, res) {
        try {
            const data = await invify_catalogue_service_1.InvifyCatalogueService.updateOffering(req.healthContext, req.params.offeringId, req.body || {});
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendCatalogueError(res, err, 'Failed to update offering');
        }
    }
    static async setCatalogueOfferingStatus(req, res) {
        try {
            const data = await invify_catalogue_service_1.InvifyCatalogueService.setOfferingStatus(req.healthContext, req.params.offeringId, req.body || {});
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendCatalogueError(res, err, 'Failed to change offering status');
        }
    }
    static async addCatalogueService(req, res) {
        try {
            const data = await invify_catalogue_service_1.InvifyCatalogueService.addService(req.healthContext, req.params.offeringId, req.body || {});
            return sendPlatformData(res, data, 201);
        }
        catch (err) {
            return sendCatalogueError(res, err, 'Failed to add service');
        }
    }
    static async addCatalogueProduct(req, res) {
        try {
            const data = await invify_catalogue_service_1.InvifyCatalogueService.addProduct(req.healthContext, req.params.serviceId, req.body || {});
            return sendPlatformData(res, data, 201);
        }
        catch (err) {
            return sendCatalogueError(res, err, 'Failed to add product');
        }
    }
    static async assignCatalogueFacility(req, res) {
        try {
            const data = await invify_catalogue_service_1.InvifyCatalogueService.assignFacility(req.healthContext, req.params.productId, req.body || {});
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendCatalogueError(res, err, 'Failed to assign facility');
        }
    }
    static async removeCatalogueFacility(req, res) {
        try {
            const data = await invify_catalogue_service_1.InvifyCatalogueService.removeFacility(req.healthContext, req.params.productId, req.params.facilityId, req.body?.reason || req.headers['x-platform-reason']);
            return sendPlatformData(res, data);
        }
        catch (err) {
            return sendCatalogueError(res, err, 'Failed to remove facility assignment');
        }
    }
    static async issueEntitlement(req, res) {
        return mutateEntitlement(req, res, (actorUserId, permission, reason) => platform_entitlement_service_1.PlatformEntitlementService.issue(actorUserId, permission, reason, req.body?.userId), 201);
    }
    static async suspendEntitlement(req, res) {
        return mutateEntitlement(req, res, (actorUserId, permission, reason) => platform_entitlement_service_1.PlatformEntitlementService.suspend(actorUserId, permission, reason));
    }
    static async revokeEntitlement(req, res) {
        return mutateEntitlement(req, res, (actorUserId, permission, reason) => platform_entitlement_service_1.PlatformEntitlementService.revoke(actorUserId, permission, reason));
    }
    static async listProviderRegistry(_req, res) {
        try {
            const providers = await health_platform_service_1.HealthPlatformService.listProviderRegistry();
            return sendPlatformData(res, { providers });
        }
        catch (err) {
            return res.status(500).json({ error: { message: err?.message || 'Failed to list HMO registry' } });
        }
    }
    static async getFinanceSnapshot(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.getFinanceSnapshot();
            return sendPlatformData(res, data);
        }
        catch (err) {
            return res.status(500).json({ success: false, error: { message: err?.message || 'Failed to summarise premiums' } });
        }
    }
    static async getFinanceCommand(req, res) {
        try {
            const data = await health_platform_service_1.HealthPlatformService.getFinanceCommand(req.query);
            return sendPlatformData(res, data);
        }
        catch (err) {
            const message = err?.message || 'Failed to load the finance command';
            const status = /YYYY-MM-DD|from is after to|status is not/.test(message) ? 400 : 500;
            return res.status(status).json({ error: { message } });
        }
    }
    static async listFacilities(req, res) {
        try {
            const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined;
            const data = await health_platform_service_1.HealthPlatformService.listFacilities(providerId);
            return sendPlatformData(res, { facilities: data });
        }
        catch (err) {
            return res.status(500).json({ success: false, error: { message: err?.message || 'Failed to list facilities' } });
        }
    }
}
exports.HealthPlatformController = HealthPlatformController;
//# sourceMappingURL=health-platform.controller.js.map