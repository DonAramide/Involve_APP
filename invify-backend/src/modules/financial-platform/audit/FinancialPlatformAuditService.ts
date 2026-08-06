// invify-backend/src/modules/financial-platform/audit/FinancialPlatformAuditService.ts

import { ObservabilityContext } from '../domain/Types';
import { supabaseAdmin as supabase } from '../../../utils/db';

const FP_ACTIONS = [
  'ACTIVATION_COMPLETED',
  'ACTIVATION_FAILED',
  'COMPENSATION_VAULT_DELETED',
  'COMPENSATION_QUASAR_DELETED',
  'CREDENTIAL_ROTATION_COMPLETED',
  'CREDENTIAL_ROTATION_FAILED',
  'DEACTIVATION_COMPLETED',
  'DEACTIVATION_FAILED',
  'FinancialPlatformActivated',
  'FinancialPlatformCredentialsRotated',
  'FinancialPlatformDeactivated'
];

export class FinancialPlatformAuditService {
  /**
   * Fetches financial-platform audit history.
   * Uses the real audit_logs schema: module, action, timestamp, metadata, status.
   */
  async getAuditHistory(tenantId: string, _context: ObservabilityContext, limit: number = 50) {
    if (!tenantId || tenantId === 'undefined') return [];

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('module', 'FINANCIAL_PLATFORM')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      // Fallback: some environments may filter by action list without module
      const { data: fallback, error: fallbackErr } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('action', FP_ACTIONS)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (fallbackErr) {
        throw new Error(`Failed to fetch audit history: ${error.message}`);
      }

      return (fallback || []).map(this.normalizeLog);
    }

    return (logs || []).map(this.normalizeLog);
  }

  private normalizeLog(row: any) {
    return {
      id: row.id,
      created_at: row.timestamp || row.created_at,
      actor_id: row.user_email || row.user_name || 'system',
      event_type: row.action,
      status: row.status,
      payload: row.metadata || {}
    };
  }
}
