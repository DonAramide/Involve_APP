import { supabaseAdmin } from '../../../db/supabase';

export class GamificationService {
  async getProfile(agentId: string) {
    const { data, error } = await supabaseAdmin
      .from('agent_reputation_summary')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }
    return data;
  }

  async getBadges(agentId: string) {
    const { data, error } = await supabaseAdmin
      .from('agent_badges')
      .select(`
        *,
        badges (*)
      `)
      .eq('agent_id', agentId);

    if (error) {
      throw new Error(`Failed to fetch badges: ${error.message}`);
    }
    return data;
  }

  async getLeaderboard(limit: number = 10) {
    const { data, error } = await supabaseAdmin
      .from('agent_reputation_summary')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch leaderboard: ${error.message}`);
    }
    return data;
  }

  static async injectReputation(agentId: string, points: number, reason: string): Promise<void> {
    try {
      const { error: eventError } = await supabaseAdmin
        .from('agent_events')
        .insert({
          agent_id: agentId,
          event_type: 'REPUTATION_INJECTED',
          metadata: { points, reason }
        });
        
      if (eventError) throw eventError;

      const { data: repData } = await supabaseAdmin
        .from('agent_reputations')
        .select('score')
        .eq('agent_id', agentId)
        .single();

      const currentScore = repData?.score || 0;
      const newScore = currentScore + points;

      const { error: repError } = await supabaseAdmin
        .from('agent_reputations')
        .upsert({
          agent_id: agentId,
          score: newScore,
          updated_at: new Date().toISOString()
        }, { onConflict: 'agent_id' });

      if (repError) throw repError;

      console.log(`[GamificationService] Injected ${points} points for agent ${agentId} due to ${reason}`);
    } catch (err) {
      console.error(`[GamificationService] Error injecting reputation:`, err);
    }
  }

  static async evaluateBadges(agentId: string): Promise<void> {
    try {
      // Mock evaluation using badges and agent_badges
      const { data: badges } = await supabaseAdmin.from('badges').select('*');
      if (!badges || badges.length === 0) return;

      const mockBadgeId = badges[0].id; // Just unlock the first badge for demo

      const { error } = await supabaseAdmin
        .from('agent_badges')
        .insert({
          agent_id: agentId,
          badge_id: mockBadgeId,
          awarded_at: new Date().toISOString()
        });
      
      if (!error) {
        console.log(`[GamificationService] Awarded badge ${mockBadgeId} to agent ${agentId}`);
      }
    } catch (err) {
      console.error(`[GamificationService] Error evaluating badges:`, err);
    }
  }
}
