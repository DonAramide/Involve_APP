import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';

const router = Router();

router.get('/onboarding', SettingsController.getOnboardingSettings);
router.patch('/onboarding', SettingsController.updateOnboardingSettings);

export default router;
