// invify-backend/src/modules/health-insurance/services/health-audit.service.ts
import { supabaseAdmin } from '../../../db/supabase';

export interface LogAuditEventParams {
  tenantId: string;
  actorUserId?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  viaPlatformAccess?: boolean;
  platformReason?: string;
}

/**
 * Health Insurance Audit Logger.
 * Writes to hw_audit_events, an append-only table protected by DB trigger against mutations.
 */
export class HealthAuditService {
  static async log(params: LogAuditEventParams): Promise<void> {
    try {
      const { error } = await supabaseAdmin
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
    } catch (err: any) {
      console.error('[HealthAuditService] Error recording audit log:', err?.message || err);
    }
  }
}
