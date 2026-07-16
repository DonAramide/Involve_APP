import { Router } from 'express';
import { VaultController } from '../controllers/vault.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// In production, require authenticate middleware:
// router.use(authenticate);

router.get('/integrations', VaultController.listIntegrations);
router.post('/integrations', VaultController.registerIntegration);
router.post('/integrations/:vaultId/credentials', VaultController.addCredential);
router.patch('/integrations/:vaultId/credentials/:credentialId/activate', VaultController.activateCredential);
router.delete('/integrations/:vaultId/credentials/:credentialId', VaultController.deleteCredential);
router.post('/integrations/:vaultId/test', VaultController.testConnection);

export default router;
