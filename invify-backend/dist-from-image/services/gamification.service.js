"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
const gamification_service_1 = require("../modules/gamification/services/gamification.service");
class GamificationService {
    static async injectReputation(agentId, points, reason) {
        await gamification_service_1.GamificationService.injectReputation(agentId, points, reason);
    }
}
exports.GamificationService = GamificationService;
//# sourceMappingURL=gamification.service.js.map