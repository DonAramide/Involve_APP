import { supabase } from '../../../db/supabase';
export class LeadRepository {
  async create(data: any) {
    const { data: lead, error } = await supabase.from('agent_leads').insert(data).select().single();
    if (error) throw error;
    return lead;
  }
  async findByAgent(agentId: string) {
    const { data, error } = await supabase.from('agent_leads').select('*').eq('agent_id', agentId).is('deleted_at', null);
    if (error) throw error;
    return data;
  }
  async findAll() {
    const { data, error } = await supabase.from('agent_leads').select('*').is('deleted_at', null);
    if (error) throw error;
    return data;
  }
}
export const leadRepository = new LeadRepository();
