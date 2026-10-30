"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attach = exports.TENANT_BILLING_ROUTE_PATHS = void 0;
exports.attachTenantBillingRoutes = attachTenantBillingRoutes;
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const require_admin_mfa_middleware_1 = require("../../middleware/require-admin-mfa.middleware");
const tenant_billing_controller_1 = require("../../controllers/tenant-billing.controller");
exports.TENANT_BILLING_ROUTE_PATHS = [
    '/tenant-billing/overview',
    '/tenant-billing/accounts',
    '/tenant-billing/obligations',
    '/tenant-billing/plans',
    '/tenant-billing/installments',
    '/tenant-billing/subscriptions',
    '/tenant-billing/payments/preview',
    '/tenant-billing/payments',
    '/tenant-billing/payments/:id/reverse',
    '/tenant-billing/tenants/:tenantId',
    '/tenant-billing/overdue',
    '/tenant-billing/reports',
];
function attachTenantBillingRoutes(app) {
    if (!app || app._tenantBillingRoutesAttached)
        return;
    if (typeof rbac_middleware_1.checkBillingPermission !== 'function') {
        console.warn('[tenant-billing] checkBillingPermission missing; skip route attach');
        return;
    }
    app._tenantBillingRoutesAttached = true;
    const view = ['super_admin', 'admin_finance', 'admin_treasury', 'admin_executive'];
    const write = ['super_admin', 'admin_finance'];
    const reg = (method, pathAfterAdmin, ...handlers) => {
        app[method]('/admin' + pathAfterAdmin, ...handlers);
        app[method]('/api/admin' + pathAfterAdmin, ...handlers);
    };
    reg('get', '/tenant-billing/overview', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(view), (0, rbac_middleware_1.checkBillingPermission)('billing.view'), tenant_billing_controller_1.TenantBillingController.overview);
    reg('get', '/tenant-billing/accounts', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(view), (0, rbac_middleware_1.checkBillingPermission)('billing.view'), tenant_billing_controller_1.TenantBillingController.accounts);
    reg('post', '/tenant-billing/accounts', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(write), (0, rbac_middleware_1.checkBillingPermission)('billing.create_obligation'), tenant_billing_controller_1.TenantBillingController.ensureAccount);
    reg('get', '/tenant-billing/obligations', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(view), (0, rbac_middleware_1.checkBillingPermission)('billing.view'), tenant_billing_controller_1.TenantBillingController.obligations);
    reg('post', '/tenant-billing/obligations', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(write), (0, rbac_middleware_1.checkBillingPermission)('billing.create_obligation'), tenant_billing_controller_1.TenantBillingController.createObligation);
    reg('post', '/tenant-billing/plans', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(write), (0, rbac_middleware_1.checkBillingPermission)('billing.manage_plan'), tenant_billing_controller_1.TenantBillingController.createPlan);
    reg('get', '/tenant-billing/installments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(view), (0, rbac_middleware_1.checkBillingPermission)('billing.view'), tenant_billing_controller_1.TenantBillingController.installments);
    reg('post', '/tenant-billing/subscriptions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(write), (0, rbac_middleware_1.checkBillingPermission)('billing.manage_subscription'), tenant_billing_controller_1.TenantBillingController.createSubscription);
    reg('get', '/tenant-billing/payments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(view), (0, rbac_middleware_1.checkBillingPermission)('billing.view'), tenant_billing_controller_1.TenantBillingController.payments);
    reg('post', '/tenant-billing/payments/preview', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(write), (0, rbac_middleware_1.checkBillingPermission)('billing.post_payment'), tenant_billing_controller_1.TenantBillingController.previewPayment);
    reg('post', '/tenant-billing/payments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(write), require_admin_mfa_middleware_1.requireCheckerMfa, (0, rbac_middleware_1.checkBillingPermission)('billing.post_payment'), tenant_billing_controller_1.TenantBillingController.postPayment);
    reg('post', '/tenant-billing/payments/:id/reverse', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), require_admin_mfa_middleware_1.requireCheckerMfa, (0, rbac_middleware_1.checkBillingPermission)('billing.reverse_payment'), tenant_billing_controller_1.TenantBillingController.reversePayment);
    reg('get', '/tenant-billing/tenants/:tenantId', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(view), (0, rbac_middleware_1.checkBillingPermission)('billing.view'), tenant_billing_controller_1.TenantBillingController.tenantProfile);
    reg('get', '/tenant-billing/overdue', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(view), (0, rbac_middleware_1.checkBillingPermission)('billing.view'), tenant_billing_controller_1.TenantBillingController.overdue);
    reg('get', '/tenant-billing/reports', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(view), (0, rbac_middleware_1.checkBillingPermission)('billing.export'), tenant_billing_controller_1.TenantBillingController.reports);
}
exports.attach = attachTenantBillingRoutes;
//# sourceMappingURL=register-routes.js.map