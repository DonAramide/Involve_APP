import { Router } from 'express';
import { GamificationController } from '../modules/gamification/controllers/gamification.controller';

const router = Router();
const gamificationController = new GamificationController();

// Gamification endpoints
router.get('/gamification/profile', gamificationController.getProfile.bind(gamificationController));
router.get('/gamification/badges', gamificationController.getBadges.bind(gamificationController));
router.get('/gamification/leaderboard', gamificationController.getLeaderboard.bind(gamificationController));

export default router;
