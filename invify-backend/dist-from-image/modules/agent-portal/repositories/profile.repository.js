"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRepository = exports.ProfileRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class ProfileRepository {
    async getByAgentId(agentId) {
        const { data, error } = await supabase_1.supabase.from('agent_profiles').select('*').eq('agent_id', agentId).is('deleted_at', null).single();
        if (error)
            throw error;
        return data;
    }
    async update(agentId, updates) {
        const { data, error } = await supabase_1.supabase.from('agent_profiles').update(updates).eq('agent_id', agentId).select().single();
        if (error)
            throw error;
        return data;
    }
}
exports.ProfileRepository = ProfileRepository;
exports.profileRepository = new ProfileRepository();
//# sourceMappingURL=profile.repository.js.map