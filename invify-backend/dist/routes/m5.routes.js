"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gamification_controller_1 = require("../modules/gamification/controllers/gamification.controller");
const router = (0, express_1.Router)();
const gamificationController = new gamification_controller_1.GamificationController();
// Gamification endpoints
router.get('/gamification/profile', gamificationController.getProfile.bind(gamificationController));
router.get('/gamification/badges', gamificationController.getBadges.bind(gamificationController));
router.get('/gamification/leaderboard', gamificationController.getLeaderboard.bind(gamificationController));
exports.default = router;
//# sourceMappingURL=m5.routes.js.map