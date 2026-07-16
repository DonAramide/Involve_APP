"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRepository = exports.TenantRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class TenantRepository {
    async findByAgent(agentId) {
        const { data, error } = await supabase_1.supabase.from('agent_tenants').select('*, tenant_activation_progress(*)').eq('agent_id', agentId);
        if (error)
            throw error;
        return data;
    }
    async findAll() {
        const { data, error } = await supabase_1.supabase.from('agent_tenants').select('*, tenant_activation_progress(*)');
        if (error)
            throw error;
        return data;
    }
    async updateActivation(agentTenantId, updates) {
        const { data, error } = await supabase_1.supabase.from('tenant_activation_progress').update(updates).eq('agent_tenant_id', agentTenantId).select().single();
        if (error)
            throw error;
        return data;
    }
}
exports.TenantRepository = TenantRepository;
exports.tenantRepository = new TenantRepository();
//# sourceMappingURL=tenant.repository.js.map