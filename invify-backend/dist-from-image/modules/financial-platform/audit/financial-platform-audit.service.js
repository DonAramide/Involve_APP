"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialPlatformAuditService = exports.AuditStatus = exports.AuditAction = void 0;
const db_1 = require("../../../utils/db");
var AuditAction;
(function (AuditAction) {
    AuditAction["ACTIVATE"] = "ACTIVATE";
    AuditAction["ROTATE"] = "ROTATE";
    AuditAction["DEACTIVATE"] = "DEACTIVATE";
    AuditAction["HEALTH_CHECK"] = "HEALTH_CHECK";
    AuditAction["SUSPEND"] = "SUSPEND";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AuditStatus;
(function (AuditStatus) {
    AuditStatus["SUCCESS"] = "SUCCESS";
    AuditStatus["FAILURE"] = "FAILURE";
})(AuditStatus || (exports.AuditStatus = AuditStatus = {}));
class FinancialPlatformAuditService {
    async insertLog(tenantId, action, status, actorId, metadata) {
        try {
            const { error } = await db_1.supabaseAdmin.from('audit_logs').insert({
                tenant_id: tenantId,
                module: 'FINANCIAL_PLATFORM',
                action: action,
                user_email: actorId || 'system',
                user_name: actorId || 'system',
                status: status === AuditStatus.SUCCESS ? 'SUCCESS' : 'FAILED',
                metadata: metadata || {},
                target: metadata?.quasarTenantId || tenantId || null
            });
            if (error) {
                console.error(`[FP-Audit] Database log insert failed:`, error.message);
            }
        }
        catch (e) {
            console.error(`[FP-Audit] Failed logging ${action}:`, e.message);
        }
    }
    async logActivation(tenantId, actorId, status, metadata) {
        console.log(`[Audit] ACTIVATION ${status} for tenant ${tenantId} by ${actorId}`, metadata);
        await this.insertLog(tenantId, status === AuditStatus.SUCCESS ? 'ACTIVATION_COMPLETED' : 'ACTIVATION_FAILED', status, actorId, metadata);
    }
    async logRotation(tenantId, actorId, status, metadata) {
        console.log(`[Audit] ROTATION ${status} for tenant ${tenantId} by ${actorId}`, metadata);
        await this.insertLog(tenantId, status === AuditStatus.SUCCESS ? 'CREDENTIAL_ROTATION_COMPLETED' : 'CREDENTIAL_ROTATION_FAILED', status, actorId, metadata);
    }
    async logHealthCheck(tenantId, actorId, status, metadata) {
        console.log(`[Audit] HEALTH_CHECK ${status} for tenant ${tenantId} by ${actorId}`, metadata);
        await this.insertLog(tenantId, status === AuditStatus.SUCCESS ? 'HEALTH_CHECK_COMPLETED' : 'HEALTH_CHECK_FAILED', status, actorId, metadata);
    }
    async logDeactivation(tenantId, actorId, status, metadata) {
        console.log(`[Audit] DEACTIVATION ${status} for tenant ${tenantId} by ${actorId}`, metadata);
        await this.insertLog(tenantId, status === AuditStatus.SUCCESS ? 'DEACTIVATION_COMPLETED' : 'DEACTIVATION_FAILED', status, actorId, metadata);
    }
}
exports.FinancialPlatformAuditService = FinancialPlatformAuditService;
//# sourceMappingURL=financial-platform-audit.service.js.map