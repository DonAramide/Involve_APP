"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationController = void 0;
const gamification_service_1 = require("../services/gamification.service");
const gamificationService = new gamification_service_1.GamificationService();
class GamificationController {
    async getProfile(req, res) {
        try {
            const { agentId } = req.query;
            if (!agentId || typeof agentId !== 'string') {
                res.status(400).json({ error: 'agentId query parameter is required' });
                return;
            }
            const profile = await gamificationService.getProfile(agentId);
            res.json(profile);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getBadges(req, res) {
        try {
            const { agentId } = req.query;
            if (!agentId || typeof agentId !== 'string') {
                res.status(400).json({ error: 'agentId query parameter is required' });
                return;
            }
            const badges = await gamificationService.getBadges(agentId);
            res.json(badges);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getLeaderboard(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const leaderboard = await gamificationService.getLeaderboard(limit);
            res.json(leaderboard);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.GamificationController = GamificationController;
//# sourceMappingURL=gamification.controller.js.map