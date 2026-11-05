"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthAuditService = void 0;
// invify-backend/src/modules/health-insurance/services/health-audit.service.ts
const supabase_1 = require("../../../db/supabase");
/**
 * Health Insurance Audit Logger.
 * Writes to hw_audit_events, an append-only table protected by DB trigger against mutations.
 */
class HealthAuditService {
    static async log(params) {
        try {
            const { error } = await supabase_1.supabaseAdmin
                .from('hw_audit_events')
                .insert({
                tenant_id: params.tenantId,
                actor_user_id: params.actorUserId || null,
                actor_role: params.actorRole || null,
                action: params.action,
                resource_type: params.resourceType,
                resource_id: params.resourceId,
                changes: params.changes || {},
                ip_address: params.ipAddress || null,
                user_agent: params.userAgent || null,
                via_platform_access: !!params.viaPlatformAccess,
                platform_reason: params.platformReason || null,
                occurred_at: new Date().toISOString()
            });
            if (error) {
                console.error('[HealthAuditService] Failed to record audit log:', error.message);
            }
        }
        catch (err) {
            console.error('[HealthAuditService] Error recording audit log:', err?.message || err);
        }
    }
    static async recordEvent(params) {
        return this.log(params);
    }
    /**
     * Tenant-scoped health audit. Do not use for Invify catalogue writes:
     * hw_audit_events.tenant_id is NOT NULL and references tenants(id).
     * Catalogue mutations use hw_catalogue_apply_mutation instead.
     */
    static async recordEventOrThrow(params) {
        const { error } = await supabase_1.supabaseAdmin
            .from('hw_audit_events')
            .insert({
            tenant_id: params.tenantId,
            actor_user_id: params.actorUserId || null,
            actor_role: params.actorRole || null,
            action: params.action,
            resource_type: params.resourceType,
            resource_id: params.resourceId,
            changes: params.changes || {},
            ip_address: params.ipAddress || null,
            user_agent: params.userAgent || null,
            via_platform_access: !!params.viaPlatformAccess,
            platform_reason: params.platformReason || null,
            occurred_at: new Date().toISOString()
        });
        if (error) {
            const err = new Error('Catalogue change was not recorded in the audit log and was not completed.');
            err.status = 503;
            err.code = 'CATALOGUE_AUDIT_FAILED';
            throw err;
        }
    }
}
exports.HealthAuditService = HealthAuditService;
//# sourceMappingURL=health-audit.service.js.map