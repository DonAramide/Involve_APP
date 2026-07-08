import { Router } from 'express';
import { ExecutiveFinanceController } from '../controllers/finance.controller';

const router = Router();

router.get('/executive-summary', ExecutiveFinanceController.getSummary);
router.get('/stats/payouts', ExecutiveFinanceController.getPayoutStats);

export default router;
