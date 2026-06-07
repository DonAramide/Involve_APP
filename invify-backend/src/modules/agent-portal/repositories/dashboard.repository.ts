import { supabase } from '../../../db/supabase';
export class DashboardRepository {
  async getMetrics(agentId: string) {
    const { data, error } = await supabase.from('agent_dashboard_snapshots').select('*').eq('agent_id', agentId).order('snapshot_date', { ascending: false }).limit(30);
    if (error) throw error;
    return data;
  }
}
export const dashboardRepository = new DashboardRepository();
