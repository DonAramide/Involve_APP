import { supabase } from '../../../db/supabase';

export class CertificationService {
  async getCertifications(agentId?: string) {
    let query = supabase.from('agent_certificates').select('*');
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
