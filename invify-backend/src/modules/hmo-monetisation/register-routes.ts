import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { checkRole } from '../../middleware/rbac.middleware';
import { requireHmoInstitution } from '../health-insurance/guards/hmo-institution.guard';
import { HmoMonetisationController } from './hmo-monetisation.controller';

const adminRoles = ['super_admin', 'admin_deploy'];

function requireTenantSelf(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user || {};
  const tenantId = String(user.tenant_id || user.tenantId || '');
  if (!tenantId) {
    return res.status(403).json({
      success: false,
      error: { code: 'TENANT_REQUIRED', message: 'Tenant context is required.' },
    });
  }
  req.params.entityType = 'TENANT';
  req.params.entityId = tenantId;
  next();
}

export function attachHmoMonetisationRoutes(app: any): void {
  if (!app || app._hmoMonetisationRoutesAttached) return;
  app._hmoMonetisationRoutesAttached = true;

  const admin = Router();
  admin.use(authenticate, checkRole(adminRoles));
  admin.get('/bank-account-requests', HmoMonetisationController.adminBankList);
  admin.get('/bank-account-requests/:id', HmoMonetisationController.adminBankGet);
  admin.post('/bank-account-requests/:id/decide', HmoMonetisationController.adminBankDecide);
  admin.get('/hmo-finance-report', HmoMonetisationController.financeReport);
  admin.post('/hmo-service-fee/preview', HmoMonetisationController.previewFee);
  app.use('/api/admin', admin);

  const tenant = Router();
  tenant.use(authenticate, requireTenantSelf);
  tenant.get('/bank-accounts', HmoMonetisationController.entityBankList);
  tenant.post('/bank-accounts', HmoMonetisationController.entityBankSubmit);
  app.use('/api/tenant', tenant);

  const hmo = Router();
  hmo.get('/earnings', requireHmoInstitution(['institution.hmo_earnings.view', 'hmo.billing.view']), HmoMonetisationController.institutionEarnings);
  hmo.get('/withdrawals', requireHmoInstitution(['institution.withdrawals.view', 'hmo.billing.view']), HmoMonetisationController.institutionWithdrawals);
  hmo.post('/withdrawals', requireHmoInstitution(['institution.withdrawals.create', 'hmo.billing.reconcile']), HmoMonetisationController.createInstitutionWithdrawal);
  hmo.get('/bank-accounts', requireHmoInstitution(['institution.bank_accounts.manage', 'hmo.profile.manage']), (req, res, next) => {
    const ctx = (req as any).hmoContext;
    req.params.entityType = 'INSTITUTION';
    req.params.entityId = String(ctx?.institutionId || '');
    next();
  }, HmoMonetisationController.entityBankList);
  hmo.post('/bank-accounts', requireHmoInstitution(['institution.bank_accounts.manage', 'hmo.profile.manage']), (req, res, next) => {
    const ctx = (req as any).hmoContext;
    req.params.entityType = 'INSTITUTION';
    req.params.entityId = String(ctx?.institutionId || '');
    req.body = { ...req.body, entityName: req.body?.entityName || ctx?.institutionName };
    next();
  }, HmoMonetisationController.entityBankSubmit);
  app.use('/api/agent/hmo', hmo);
}
