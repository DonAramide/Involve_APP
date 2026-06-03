import { supabase } from '../../../db/supabase';
export class TenantRepository {
  async findByAgent(agentId: string) {
    const { data, error } = await supabase.from('agent_tenants').select('*, tenant_activation_progress(*)').eq('agent_id', agentId);
    if (error) throw error;
    return data;
  }
  async findAll() {
    const { data, error } = await supabase.from('agent_tenants').select('*, tenant_activation_progress(*)');
    if (error) throw error;
    return data;
  }
  async updateActivation(agentTenantId: string, updates: any) {
    const { data, error } = await supabase.from('tenant_activation_progress').update(updates).eq('agent_tenant_id', agentTenantId).select().single();
    if (error) throw error;
    return data;
  }
}
export const tenantRepository = new TenantRepository();