"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("../controllers/settings.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const router = (0, express_1.Router)();
router.get('/onboarding', settings_controller_1.SettingsController.getOnboardingSettings);
router.patch('/onboarding', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'admin_deploy']), settings_controller_1.SettingsController.updateOnboardingSettings);
exports.default = router;
//# sourceMappingURL=settings.routes.js.map