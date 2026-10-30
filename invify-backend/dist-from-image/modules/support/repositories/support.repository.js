"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportRepository = exports.SupportRepository = void 0;
const supabase_1 = require("../../../db/supabase");
class SupportRepository {
    async findAll() {
        const { data, error } = await supabase_1.supabase.from('support_tickets').select('*').is('deleted_at', null).order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
}
exports.SupportRepository = SupportRepository;
exports.supportRepository = new SupportRepository();
//# sourceMappingURL=support.repository.js.map