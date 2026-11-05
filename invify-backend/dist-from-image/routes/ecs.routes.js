"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ecs_controller_1 = require("../controllers/ecs.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
// RBAC middleware placeholder
const requireCapability = (capability) => {
    return (req, res, next) => {
        // In production, verify req.user.capabilities includes capability
        next();
    };
};
const router = (0, express_1.Router)();
// Secure all ECS routes
router.use(auth_middleware_1.authenticate);
// Providers & Schemas (Viewers)
router.get('/providers', requireCapability('ECS_Viewer'), ecs_controller_1.EcsController.getProviders);
router.get('/:namespace/definitions', requireCapability('ECS_Viewer'), ecs_controller_1.EcsController.getDefinitions);
// Runtime Config (Viewers)
router.get('/:namespace', requireCapability('ECS_Viewer'), ecs_controller_1.EcsController.resolveConfiguration);
// Mutations (Editors / Administrators)
router.put('/:namespace', requireCapability('ECS_Editor'), ecs_controller_1.EcsController.saveConfiguration);
// Health Checks
router.post('/:namespace/test', requireCapability('ECS_Viewer'), ecs_controller_1.EcsController.runHealthCheck);
exports.default = router;
//# sourceMappingURL=ecs.routes.js.map