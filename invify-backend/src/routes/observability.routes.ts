// invify-backend/src/routes/observability.routes.ts
import { Router } from 'express';
import { ObservabilityController } from '../controllers/observability.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/rbac.middleware';

const router = Router();

// Strict Super Admin RBAC enforcement on both endpoints
router.get(
  '/snapshot',
  authenticate,
  checkRole(['super_admin']),
  ObservabilityController.getSnapshot,
);

router.get(
  '/logs',
  authenticate,
  checkRole(['super_admin']),
  ObservabilityController.getLogs,
);

router.get(
  '/stream',
  authenticate,
  checkRole(['super_admin']),
  ObservabilityController.stream,
);

export default router;
