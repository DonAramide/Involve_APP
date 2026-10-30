"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// invify-backend/src/routes/observability.routes.ts
const express_1 = require("express");
const observability_controller_1 = require("../controllers/observability.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const router = (0, express_1.Router)();
// Strict Super Admin RBAC enforcement on both endpoints
router.get('/snapshot', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), observability_controller_1.ObservabilityController.getSnapshot);
router.get('/logs', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), observability_controller_1.ObservabilityController.getLogs);
router.get('/stream', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), observability_controller_1.ObservabilityController.stream);
exports.default = router;
//# sourceMappingURL=observability.routes.js.map