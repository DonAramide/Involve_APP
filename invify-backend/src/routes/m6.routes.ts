import { Router } from 'express';
import { M6AnalyticsController } from '../modules/analytics/controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/analytics/performance', authenticate, M6AnalyticsController.getPerformance);
router.get('/analytics/territory', authenticate, M6AnalyticsController.getTerritory);
router.get('/analytics/risk-signals', authenticate, M6AnalyticsController.getRiskSignals);

export default router;
