import { Router } from 'express';
import { UserController } from '../controllers/operations/user.controller';
import { SettingsController } from '../controllers/operations/settings.controller';
import { AuditController } from '../controllers/operations/audit.controller';

const router = Router();

// Users
router.get('/users', UserController.listUsers);
router.post('/users', UserController.createUser);

// Settings
router.put('/settings/:group', SettingsController.updateSettings);

// Audit
router.get('/audit', AuditController.listLogs);

// Additional operational routes (Roles, API Keys, Webhooks) would be added here

export default router;
