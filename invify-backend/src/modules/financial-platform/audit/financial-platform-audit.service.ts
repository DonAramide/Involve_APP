import { supabaseAdmin as supabase } from '../../../utils/db';

export enum AuditAction {
  ACTIVATE = 'ACTIVATE',
  ROTATE = 'ROTATE',
  DEACTIVATE = 'DEACTIVATE',
  HEALTH_CHECK = 'HEALTH_CHECK',
  SUSPEND = 'SUSPEND'
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE'
}

export class FinancialPlatformAuditService {
  private async insertLog(tenantId: string, action: string, status: AuditStatus, actorId: string, metadata?: Record<string, any>) {
    try {
      const { error } = await supabase.from('audit_logs').insert({
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
    } catch (e: any) {
      console.error(`[FP-Audit] Failed logging ${action}:`, e.message);
    }
  }

  async logActivation(tenantId: string, actorId: string, status: AuditStatus, metadata?: Record<string, any>): Promise<void> {
    console.log(`[Audit] ACTIVATION ${status} for tenant ${tenantId} by ${actorId}`, metadata);
    await this.insertLog(tenantId, status === AuditStatus.SUCCESS ? 'ACTIVATION_COMPLETED' : 'ACTIVATION_FAILED', status, actorId, metadata);
  }

  async logRotation(tenantId: string, actorId: string, status: AuditStatus, metadata?: Record<string, any>): Promise<void> {
    console.log(`[Audit] ROTATION ${status} for tenant ${tenantId} by ${actorId}`, metadata);
    await this.insertLog(tenantId, status === AuditStatus.SUCCESS ? 'CREDENTIAL_ROTATION_COMPLETED' : 'CREDENTIAL_ROTATION_FAILED', status, actorId, metadata);
  }

  async logHealthCheck(tenantId: string, actorId: string, status: AuditStatus, metadata?: Record<string, any>): Promise<void> {
    console.log(`[Audit] HEALTH_CHECK ${status} for tenant ${tenantId} by ${actorId}`, metadata);
    await this.insertLog(tenantId, status === AuditStatus.SUCCESS ? 'HEALTH_CHECK_COMPLETED' : 'HEALTH_CHECK_FAILED', status, actorId, metadata);
  }

  async logDeactivation(tenantId: string, actorId: string, status: AuditStatus, metadata?: Record<string, any>): Promise<void> {
    console.log(`[Audit] DEACTIVATION ${status} for tenant ${tenantId} by ${actorId}`, metadata);
    await this.insertLog(tenantId, status === AuditStatus.SUCCESS ? 'DEACTIVATION_COMPLETED' : 'DEACTIVATION_FAILED', status, actorId, metadata);
  }
}
