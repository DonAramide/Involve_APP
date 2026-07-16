"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../modules/analytics/controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/analytics/performance', auth_middleware_1.authenticate, analytics_controller_1.M6AnalyticsController.getPerformance);
router.get('/analytics/territory', auth_middleware_1.authenticate, analytics_controller_1.M6AnalyticsController.getTerritory);
router.get('/analytics/risk-signals', auth_middleware_1.authenticate, analytics_controller_1.M6AnalyticsController.getRiskSignals);
exports.default = router;
//# sourceMappingURL=m6.routes.js.map