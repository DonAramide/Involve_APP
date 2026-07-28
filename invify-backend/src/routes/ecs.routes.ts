import { Router } from 'express';
import { EcsController } from '../controllers/ecs.controller';
import { authenticate } from '../middleware/auth.middleware';

// RBAC middleware placeholder
const requireCapability = (capability: string) => {
  return (req: any, res: any, next: any) => {
    // In production, verify req.user.capabilities includes capability
    next();
  };
};

const router = Router();

// Secure all ECS routes
router.use(authenticate);

// Providers & Schemas (Viewers)
router.get('/providers', requireCapability('ECS_Viewer'), EcsController.getProviders);
router.get('/:namespace/definitions', requireCapability('ECS_Viewer'), EcsController.getDefinitions);

// Runtime Config (Viewers)
router.get('/:namespace', requireCapability('ECS_Viewer'), EcsController.resolveConfiguration);

// Mutations (Editors / Administrators)
router.put('/:namespace', requireCapability('ECS_Editor'), EcsController.saveConfiguration);

// Health Checks
router.post('/:namespace/test', requireCapability('ECS_Viewer'), EcsController.runHealthCheck);

export default router;
