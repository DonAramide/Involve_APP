import { supabase } from '../../../db/supabase';

export class M6AnalyticsService {
  static async getPerformanceMetrics() {
    const { data: performanceData, error: perfError } = await supabase
      .from('mv_agent_performance')
      .select('*');
      
    if (perfError) throw perfError;

    const { data: reputationData, error: repError } = await supabase
      .from('mv_reputation_analytics')
      .select('*');
      
    if (repError) throw repError;

    return {
      performance: performanceData,
      reputation: reputationData
    };
  }

  static async getTerritoryIntelligence() {
    const { data, error } = await supabase
      .from('mv_territory_intelligence')
      .select('*');
      
    if (error) throw error;
    return data;
  }

  static async getRiskSignals() {
    const { data, error } = await supabase
      .from('mv_operational_risk_signals')
      .select('*');
      
    if (error) throw error;
    return data;
  }
}
