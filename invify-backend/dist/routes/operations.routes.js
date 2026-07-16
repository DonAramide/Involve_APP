"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/operations/user.controller");
const settings_controller_1 = require("../controllers/operations/settings.controller");
const audit_controller_1 = require("../controllers/operations/audit.controller");
const router = (0, express_1.Router)();
// Users
router.get('/users', user_controller_1.UserController.listUsers);
router.post('/users', user_controller_1.UserController.createUser);
// Settings
router.put('/settings/:group', settings_controller_1.SettingsController.updateSettings);
// Audit
router.get('/audit', audit_controller_1.AuditController.listLogs);
// Additional operational routes (Roles, API Keys, Webhooks) would be added here
exports.default = router;
//# sourceMappingURL=operations.routes.js.map