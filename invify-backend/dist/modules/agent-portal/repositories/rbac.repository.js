"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbacRepository = exports.RbacRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class RbacRepository {
    async listRoles() {
        const { data, error } = await supabase_1.supabase.from('agent_roles').select('*');
        if (error)
            throw error;
        return data;
    }
}
exports.RbacRepository = RbacRepository;
exports.rbacRepository = new RbacRepository();
//# sourceMappingURL=rbac.repository.js.map