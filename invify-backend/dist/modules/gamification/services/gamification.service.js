"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
const supabase_1 = require("../../../db/supabase");
class GamificationService {
    async getProfile(agentId) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('agent_reputation_summary')
            .select('*')
            .eq('agent_id', agentId)
            .single();
        if (error) {
            throw new Error(`Failed to fetch profile: ${error.message}`);
        }
        return data;
    }
    async getBadges(agentId) {
        const { data, error } = await supabase_1.supabaseAdmin
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
    async getLeaderboard(limit = 10) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('agent_reputation_summary')
            .select('*')
            .order('score', { ascending: false })
            .limit(limit);
        if (error) {
            throw new Error(`Failed to fetch leaderboard: ${error.message}`);
        }
        return data;
    }
    static async injectReputation(agentId, points, reason) {
        try {
            const { error: eventError } = await supabase_1.supabaseAdmin
                .from('agent_events')
                .insert({
                agent_id: agentId,
                event_type: 'REPUTATION_INJECTED',
                metadata: { points, reason }
            });
            if (eventError)
                throw eventError;
            const { data: repData } = await supabase_1.supabaseAdmin
                .from('agent_reputations')
                .select('score')
                .eq('agent_id', agentId)
                .single();
            const currentScore = repData?.score || 0;
            const newScore = currentScore + points;
            const { error: repError } = await supabase_1.supabaseAdmin
                .from('agent_reputations')
                .upsert({
                agent_id: agentId,
                score: newScore,
                updated_at: new Date().toISOString()
            }, { onConflict: 'agent_id' });
            if (repError)
                throw repError;
            console.log(`[GamificationService] Injected ${points} points for agent ${agentId} due to ${reason}`);
        }
        catch (err) {
            console.error(`[GamificationService] Error injecting reputation:`, err);
        }
    }
    static async evaluateBadges(agentId) {
        try {
            // Mock evaluation using badges and agent_badges
            const { data: badges } = await supabase_1.supabaseAdmin.from('badges').select('*');
            if (!badges || badges.length === 0)
                return;
            const mockBadgeId = badges[0].id; // Just unlock the first badge for demo
            const { error } = await supabase_1.supabaseAdmin
                .from('agent_badges')
                .insert({
                agent_id: agentId,
                badge_id: mockBadgeId,
                awarded_at: new Date().toISOString()
            });
            if (!error) {
                console.log(`[GamificationService] Awarded badge ${mockBadgeId} to agent ${agentId}`);
            }
        }
        catch (err) {
            console.error(`[GamificationService] Error evaluating badges:`, err);
        }
    }
}
exports.GamificationService = GamificationService;
//# sourceMappingURL=gamification.service.js.map