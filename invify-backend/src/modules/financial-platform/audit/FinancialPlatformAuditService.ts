// invify-backend/src/modules/financial-platform/audit/FinancialPlatformAuditService.ts

import { ObservabilityContext } from '../domain/Types';
import { supabase } from '../../../utils/db'; // Placeholder DB Client

export class FinancialPlatformAuditService {
  /**
   * Fetches the append-only operational audit history for the financial platform connection.
   */
  async getAuditHistory(tenantId: string, context: ObservabilityContext, limit: number = 50) {
    // Queries an append-only audit_logs table
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('event_type', [
        'ACTIVATION_COMPLETED',
        'ACTIVATION_FAILED',
        'COMPENSATION_VAULT_DELETED',
        'COMPENSATION_QUASAR_DELETED',
        'CREDENTIAL_ROTATION_COMPLETED',
        'CREDENTIAL_ROTATION_FAILED'
      ])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch audit history: ${error.message}`);
    }

    return logs || [];
  }
}
