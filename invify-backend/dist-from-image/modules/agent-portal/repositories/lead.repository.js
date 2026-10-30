"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadRepository = exports.LeadRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class LeadRepository {
    async create(data) {
        const { data: lead, error } = await supabase_1.supabase.from('agent_leads').insert(data).select().single();
        if (error)
            throw error;
        return lead;
    }
    async findByAgent(agentId) {
        const { data, error } = await supabase_1.supabase.from('agent_leads').select('*').eq('agent_id', agentId).is('deleted_at', null);
        if (error)
            throw error;
        return data;
    }
    async findAll() {
        const { data, error } = await supabase_1.supabase.from('agent_leads').select('*').is('deleted_at', null);
        if (error)
            throw error;
        return data;
    }
}
exports.LeadRepository = LeadRepository;
exports.leadRepository = new LeadRepository();
//# sourceMappingURL=lead.repository.js.map