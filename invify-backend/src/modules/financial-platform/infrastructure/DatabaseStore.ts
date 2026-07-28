import { supabase } from '../../../db/supabase';

export class DatabaseStore {
  async getActiveTenants() {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('status', 'active');
    
    if (error) {
      throw new Error(`Failed to fetch active tenants: ${error.message}`);
    }
    return data || [];
  }

  async getSucceededPayments(tenantId: string, targetDate: string) {
    const { data, error } = await supabase
      .from('transactions_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'SUCCESS')
      .eq('type', 'payment')
      .gte('created_at', `${targetDate}T00:00:00.000Z`)
      .lte('created_at', `${targetDate}T23:59:59.999Z`);

    if (error) {
      throw new Error(`Failed to fetch succeeded payments: ${error.message}`);
    }
    return data || [];
  }

  async createReconciliationRecord(payload: any) {
    const caseNumber = `RC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const { data, error } = await supabase
      .from('reconciliation_cases')
      .insert({
        case_number: caseNumber,
        tenant_id: payload.tenantId,
        target_type: payload.targetType,
        target_id: payload.targetId,
        discrepancy_type: payload.discrepancyType,
        invify_state: payload.invifyState,
        quasar_state: payload.quasarState,
        status: payload.status,
        expected_amount: payload.invifyState ? payload.invifyState.amount : 0,
        actual_amount: payload.quasarState ? payload.quasarState.amount : 0,
        difference_amount: (payload.invifyState ? payload.invifyState.amount : 0) - (payload.quasarState ? payload.quasarState.amount : 0)
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create reconciliation record: ${error.message}`);
    }
    return data;
  }

  async updateReconciliationRecord(recordId: string, payload: any) {
    const { data, error } = await supabase
      .from('reconciliation_cases')
      .update({
        status: payload.status,
        resolved_at: payload.resolvedAt,
        resolution_notes: payload.resolutionNotes
      })
      .eq('id', recordId)
      .or(`case_number.eq.${recordId}`)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update reconciliation record: ${error.message}`);
    }
    return data;
  }
}
