import { supabaseAdmin } from '../../../db/supabase';
export class TenantRepository {
  async findByAgent(agentId: string) {
    const { data, error } = await supabaseAdmin
      .from('agent_tenants')
      .select('*, tenant_activation_progress(*)')
      .eq('agent_id', agentId)
      .is('deleted_at', null);
    if (error) throw error;
    return data;
  }
  async findAll() {
    const { data, error } = await supabaseAdmin
      .from('agent_tenants')
      .select('*, tenant_activation_progress(*)')
      .is('deleted_at', null);
    if (error) throw error;
    return data;
  }
  async updateActivation(agentTenantId: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('tenant_activation_progress')
      .update(updates)
      .eq('agent_tenant_id', agentTenantId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
export const tenantRepository = new TenantRepository();
