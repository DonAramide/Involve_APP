"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sync_controller_1 = require("../controllers/sync.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Endpoint: POST /api/v1/sync/outbox
router.post('/outbox', auth_middleware_1.authenticate, sync_controller_1.SyncController.handleSync);
exports.default = router;
//# sourceMappingURL=sync.routes.js.map