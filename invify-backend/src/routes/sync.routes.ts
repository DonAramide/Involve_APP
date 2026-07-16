import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Endpoint: POST /api/v1/sync/outbox
router.post('/outbox', authenticate, SyncController.handleSync);

export default router;
