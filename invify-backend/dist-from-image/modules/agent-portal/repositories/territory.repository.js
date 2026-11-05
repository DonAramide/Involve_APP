"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.territoryRepository = exports.TerritoryRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class TerritoryRepository {
    async create(data) {
        const { data: territory, error } = await supabase_1.supabase.from('agent_territories').insert(data).select().single();
        if (error)
            throw error;
        return territory;
    }
    async findAll() {
        const { data, error } = await supabase_1.supabase.from('agent_territories').select('*').is('deleted_at', null);
        if (error)
            throw error;
        return data;
    }
    async update(id, updates) {
        const { data, error } = await supabase_1.supabase.from('agent_territories').update(updates).eq('id', id).select().single();
        if (error)
            throw error;
        return data;
    }
}
exports.TerritoryRepository = TerritoryRepository;
exports.territoryRepository = new TerritoryRepository();
//# sourceMappingURL=territory.repository.js.map