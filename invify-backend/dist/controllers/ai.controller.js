"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const ai_service_1 = require("../services/ai.service");
class AIController {
    /**
     * POST /ai/lesson-note/generate
     */
    static async generateLessonNote(req, res) {
        try {
            const { className, subjectName, term, week, topic, forceRefresh } = req.body;
            const tenantId = req.user?.tenantId || req.body.tenantId;
            if (!className || !subjectName || !topic || !tenantId) {
                return res.status(400).json({ error: "Missing required generation parameters" });
            }
            const note = await ai_service_1.AIService.generateLessonNote({
                className, subjectName, term, week, topic, tenantId, forceRefresh
            });
            return res.status(200).json(note);
        }
        catch (error) {
            console.error('[AIController] generate Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /ai/lesson-note/refresh
     */
    static async refreshLessonNote(req, res) {
        try {
            const { className, subjectName, term, week } = req.body;
            const tenantId = req.user?.tenantId;
            const note = await ai_service_1.AIService.generateLessonNote({
                className, subjectName, term, week, tenantId, forceRefresh: true
            });
            return res.status(200).json(note);
        }
        catch (error) {
            console.error('[AIController] refresh Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
    }
}
exports.AIController = AIController;
//# sourceMappingURL=ai.controller.js.map