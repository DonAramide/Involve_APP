import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/rbac.middleware';

const router = Router();

router.get('/onboarding', SettingsController.getOnboardingSettings);
router.patch(
  '/onboarding',
  authenticate,
  checkRole(['super_admin', 'admin', 'admin_deploy']),
  SettingsController.updateOnboardingSettings,
);

export default router;
