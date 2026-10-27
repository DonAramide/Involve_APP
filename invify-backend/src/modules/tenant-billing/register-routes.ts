import { authenticate } from '../../middleware/auth.middleware';
import { checkRole, checkBillingPermission } from '../../middleware/rbac.middleware';
import { requireCheckerMfa } from '../../middleware/require-admin-mfa.middleware';
import { TenantBillingController } from '../../controllers/tenant-billing.controller';

export const TENANT_BILLING_ROUTE_PATHS = [
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
] as const;

export function attachTenantBillingRoutes(app: any): void {
  if (!app || app._tenantBillingRoutesAttached) return;
  if (typeof checkBillingPermission !== 'function') {
    console.warn('[tenant-billing] checkBillingPermission missing; skip route attach');
    return;
  }
  app._tenantBillingRoutesAttached = true;
  const view = ['super_admin', 'admin_finance', 'admin_treasury', 'admin_executive'];
  const write = ['super_admin', 'admin_finance'];
  const reg = (method: 'get' | 'post', pathAfterAdmin: string, ...handlers: any[]) => {
    app[method]('/admin' + pathAfterAdmin, ...handlers);
    app[method]('/api/admin' + pathAfterAdmin, ...handlers);
  };
  reg('get', '/tenant-billing/overview', authenticate, checkRole(view), checkBillingPermission('billing.view'), TenantBillingController.overview);
  reg('get', '/tenant-billing/accounts', authenticate, checkRole(view), checkBillingPermission('billing.view'), TenantBillingController.accounts);
  reg('post', '/tenant-billing/accounts', authenticate, checkRole(write), checkBillingPermission('billing.create_obligation'), TenantBillingController.ensureAccount);
  reg('get', '/tenant-billing/obligations', authenticate, checkRole(view), checkBillingPermission('billing.view'), TenantBillingController.obligations);
  reg('post', '/tenant-billing/obligations', authenticate, checkRole(write), checkBillingPermission('billing.create_obligation'), TenantBillingController.createObligation);
  reg('post', '/tenant-billing/plans', authenticate, checkRole(write), checkBillingPermission('billing.manage_plan'), TenantBillingController.createPlan);
  reg('get', '/tenant-billing/installments', authenticate, checkRole(view), checkBillingPermission('billing.view'), TenantBillingController.installments);
  reg('post', '/tenant-billing/subscriptions', authenticate, checkRole(write), checkBillingPermission('billing.manage_subscription'), TenantBillingController.createSubscription);
  reg('get', '/tenant-billing/payments', authenticate, checkRole(view), checkBillingPermission('billing.view'), TenantBillingController.payments);
  reg('post', '/tenant-billing/payments/preview', authenticate, checkRole(write), checkBillingPermission('billing.post_payment'), TenantBillingController.previewPayment);
  reg('post', '/tenant-billing/payments', authenticate, checkRole(write), requireCheckerMfa, checkBillingPermission('billing.post_payment'), TenantBillingController.postPayment);
  reg('post', '/tenant-billing/payments/:id/reverse', authenticate, checkRole(['super_admin']), requireCheckerMfa, checkBillingPermission('billing.reverse_payment'), TenantBillingController.reversePayment);
  reg('get', '/tenant-billing/tenants/:tenantId', authenticate, checkRole(view), checkBillingPermission('billing.view'), TenantBillingController.tenantProfile);
  reg('get', '/tenant-billing/overdue', authenticate, checkRole(view), checkBillingPermission('billing.view'), TenantBillingController.overdue);
  reg('get', '/tenant-billing/reports', authenticate, checkRole(view), checkBillingPermission('billing.export'), TenantBillingController.reports);
}

export const attach = attachTenantBillingRoutes;
