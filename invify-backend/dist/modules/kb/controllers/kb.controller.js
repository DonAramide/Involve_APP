"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KBController = void 0;
const kb_service_1 = require("../services/kb.service");
const kbService = new kb_service_1.KBService();
class KBController {
    async getCategories(req, res) {
        try {
            const categories = await kbService.getCategories();
            res.json(categories);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getArticles(req, res) {
        try {
            const articles = await kbService.getArticles();
            res.json(articles);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getArticleById(req, res) {
        try {
            const article = await kbService.getArticleById(req.params.id);
            if (!article) {
                return res.status(404).json({ error: 'Article not found' });
            }
            res.json(article);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.KBController = KBController;
//# sourceMappingURL=kb.controller.js.map