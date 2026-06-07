import { supabase } from '../../../db/supabase';

export class ProfileRepository {
  async getByAgentId(agentId: string) {
    const { data, error } = await supabase.from('agent_profiles').select('*').eq('agent_id', agentId).is('deleted_at', null).single();
    if (error) throw error;
    return data;
  }
  async update(agentId: string, updates: any) {
    const { data, error } = await supabase.from('agent_profiles').update(updates).eq('agent_id', agentId).select().single();
    if (error) throw error;
    return data;
  }
}
export const profileRepository = new ProfileRepository();
