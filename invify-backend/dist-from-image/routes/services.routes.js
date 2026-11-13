"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const services_dashboard_controller_1 = require("../controllers/services-dashboard.controller");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const router = (0, express_1.Router)();
const tenantRoles = ['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier'];
router.get('/summary', (0, rbac_middleware_1.checkRole)(tenantRoles), services_dashboard_controller_1.ServicesDashboardController.getSummary);
router.post('/sync/jobs', (0, rbac_middleware_1.checkRole)(tenantRoles), services_dashboard_controller_1.ServicesDashboardController.syncJobs);
router.post('/sync/payments', (0, rbac_middleware_1.checkRole)(tenantRoles), services_dashboard_controller_1.ServicesDashboardController.syncPayments);
router.post('/sync/customers', (0, rbac_middleware_1.checkRole)(tenantRoles), services_dashboard_controller_1.ServicesDashboardController.syncCustomers);
exports.default = router;
//# sourceMappingURL=services.routes.js.map