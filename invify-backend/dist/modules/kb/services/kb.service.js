"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KBService = void 0;
const supabase_1 = require("../../../db/supabase");
class KBService {
    async getCategories() {
        const { data, error } = await supabase_1.supabase
            .from('kb_categories')
            .select('*');
        if (error)
            throw error;
        return data;
    }
    async getArticles() {
        const { data, error } = await supabase_1.supabase
            .from('kb_articles')
            .select('*');
        if (error)
            throw error;
        return data;
    }
    async getArticleById(id) {
        const { data, error } = await supabase_1.supabase
            .from('kb_articles')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
}
exports.KBService = KBService;
//# sourceMappingURL=kb.service.js.map