import { supabase } from '../../../../db/supabase';

export class ExecutiveKpiRepository {
  async getSnapshots() {
    const { data, error } = await supabase.from('executive_kpi_snapshots').select('*').order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    return data;
  }
}
export const executiveKpiRepository = new ExecutiveKpiRepository();
