// invify-backend/src/modules/health-insurance/register-routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireHealthInsuranceEnabled } from './guards/health-flag.guard';
import { requireHealthPermission } from './guards/health-permission.guard';
import { requireGuardianLink } from './guards/guardian-access.guard';
import { HealthController } from './controllers/health.controller';
import { HealthPlatformController } from './controllers/health-platform.controller';
import { HmoPortalController } from './controllers/hmo-portal.controller';
import { HealthFinanceController } from './controllers/health-finance.controller';
import { requireHmoInstitution } from './guards/hmo-institution.guard';

export function createHmoPortalRouter(): Router {
  const hmoRouter = Router();
  hmoRouter.use(authenticate);

  // 1. Overview & KPIs
  hmoRouter.get('/overview', requireHmoInstitution('hmo.dashboard.view'), HmoPortalController.getOverview);

  // 2. Organization Profile & License Verification
  hmoRouter.get('/profile', requireHmoInstitution('hmo.dashboard.view'), HmoPortalController.getProfile);
  hmoRouter.patch('/profile', requireHmoInstitution('hmo.profile.manage'), HmoPortalController.updateProfile);

  // 3. School & Employer Network
  hmoRouter.get('/schools', requireHmoInstitution('hmo.schools.view'), HmoPortalController.listSchools);
  hmoRouter.patch('/schools/:tenantId', requireHmoInstitution('hmo.schools.manage'), HmoPortalController.updateSchoolOnboarding);

  // 4. Insurance Plans & Versioned Benefits
  hmoRouter.get('/plans', requireHmoInstitution('hmo.plans.view'), HmoPortalController.listPlans);
  hmoRouter.post('/plans', requireHmoInstitution('hmo.plans.manage'), HmoPortalController.createOrVersionPlan);
  hmoRouter.patch('/plans/:planId/status', requireHmoInstitution('hmo.plans.manage'), HmoPortalController.updatePlanStatus);

  // 5. Member & Enrollment Management
  hmoRouter.get('/enrollments', requireHmoInstitution('hmo.members.view'), HmoPortalController.listEnrollments);
  hmoRouter.post('/enrollments/:id/adjudicate', requireHmoInstitution('hmo.members.manage'), HmoPortalController.adjudicateEnrollment);

  // 6. Excel / CSV Integration Centre
  hmoRouter.get('/excel/mappings', requireHmoInstitution('hmo.batches.view'), HmoPortalController.listExportMappings);
  hmoRouter.post('/excel/mappings', requireHmoInstitution('hmo.batches.export'), HmoPortalController.saveExportMapping);
  hmoRouter.get('/excel/batches', requireHmoInstitution('hmo.batches.view'), HmoPortalController.listBatches);
  hmoRouter.post('/excel/batches', requireHmoInstitution('hmo.batches.export'), HmoPortalController.createBatch);
  hmoRouter.get('/excel/batches/:batchId/export', requireHmoInstitution('hmo.batches.export'), HmoPortalController.exportBatchCsv);
  hmoRouter.post('/excel/reconcile', requireHmoInstitution('hmo.batches.reconcile'), HmoPortalController.reconcileResponseSheet);

  // 7. Provider Network (Hospitals, Clinics, Pharmacies, Labs)
  hmoRouter.get('/facilities', requireHmoInstitution('hmo.providers.view'), HmoPortalController.listFacilities);
  hmoRouter.post('/facilities', requireHmoInstitution('hmo.providers.manage'), HmoPortalController.saveFacility);

  // 8. Pre-Authorization & Claims
  hmoRouter.get('/claims', requireHmoInstitution(['hmo.claims.view', 'hmo.preauth.view']), HmoPortalController.listClaimsAndPreAuths);
  hmoRouter.post('/claims/:id/adjudicate', requireHmoInstitution(['hmo.claims.adjudicate', 'hmo.preauth.adjudicate']), HmoPortalController.adjudicateClaimOrPreAuth);

  // 9. Billing & Premium Reconciliation
  hmoRouter.get('/billing', requireHmoInstitution('hmo.billing.view'), HmoPortalController.getBillingSummary);

  // 10. HMO Users, RBAC & Audit Logs
  hmoRouter.get('/users-audit', requireHmoInstitution(['hmo.audit.view', 'hmo.users.manage', 'hmo.dashboard.view']), HmoPortalController.listUsersAndAudit);

  return hmoRouter;
}

export function createHealthInsuranceRouter(): Router {
  const router = Router();

  // Webhook ingress: Authenticated via cryptographic HMAC signature, not Supabase JWT
  router.post('/provider-webhooks/:providerCode', HealthController.handleProviderWebhook);

  // Mount HMO Institution Portal sub-router (enforces its own classification + feature flag check)
  router.use('/hmo-portal', createHmoPortalRouter());

  // All other endpoints require feature flag check AND Supabase user authentication
  router.use(requireHealthInsuranceEnabled);
  router.use(authenticate);

  // ─── Platform Super-Admin Governance (Interface C) ───────────────
  // Operator grant check and self-activation for SUPER_ADMIN
  router.get('/platform/my-grant-status', HealthPlatformController.getMyGrantStatus);
  router.get('/platform/grant-status', HealthPlatformController.getMyGrantStatus);
  router.post('/platform/grants/self-activate', HealthPlatformController.selfActivateGrant);

  // Durable entitlement. Not gated by platform.tenant_access: that grant does not
  // exist for any operator, so using it here would make first issuance impossible.
  // The controller requires a different active super_admin, the pinned holder,
  // and x-platform-reason. The holder cannot call these for their own row.
  router.post('/platform/entitlements', HealthPlatformController.issueEntitlement);
  router.post('/platform/entitlements/:permission/suspend', HealthPlatformController.suspendEntitlement);
  router.post('/platform/entitlements/:permission/revoke', HealthPlatformController.revokeEntitlement);
  router.get('/platform/grant-operators', HealthPlatformController.listGrantOperators);

  // Protected Platform Endpoints (Strictly require explicit platform.* grants & justification)
  router.get('/platform/overview', requireHealthPermission('platform.integration.health'), HealthPlatformController.getOverview);
  router.get('/platform/tenants', requireHealthPermission('platform.integration.health'), HealthPlatformController.listTenants);
  router.get('/platform/tenants/:tenantId', requireHealthPermission('platform.integration.health'), HealthPlatformController.getTenantDetail);
  router.get('/platform/institutions/:institutionId', requireHealthPermission('platform.integration.health'), HealthPlatformController.getInstitutionDetail);
  router.get('/platform/members', requireHealthPermission('platform.integration.health'), HealthPlatformController.listMembers);
  router.post('/platform/tenants/:tenantId/assignment', requireHealthPermission('platform.tenants.onboard'), HealthPlatformController.assignTenantProvider);
  router.post('/platform/tenants/:tenantId/participation', requireHealthPermission('platform.tenants.onboard'), HealthPlatformController.setTenantParticipation);
  router.get('/platform/providers', requireHealthPermission('platform.providers.manage'), HealthPlatformController.listProviderRegistry);
  router.get('/platform/providers/health', requireHealthPermission('platform.integration.health'), HealthPlatformController.getProvidersHealth);
  router.get('/platform/providers/statistics', requireHealthPermission('platform.providers.manage'), HealthPlatformController.getProviderStatistics);
  router.post('/platform/providers', requireHealthPermission('platform.providers.manage'), HealthPlatformController.registerProvider);
  router.get('/platform/providers/:providerId', requireHealthPermission('platform.providers.manage'), HealthPlatformController.getProviderDetail);
  router.patch('/platform/providers/:providerId', requireHealthPermission('platform.providers.manage'), HealthPlatformController.updateProvider);
  router.post('/platform/providers/:providerId/approve', requireHealthPermission('platform.providers.manage'), HealthPlatformController.approveProvider);
  router.post('/platform/providers/:providerId/reject', requireHealthPermission('platform.providers.manage'), HealthPlatformController.rejectProvider);
  router.post('/platform/providers/:providerId/suspend', requireHealthPermission('platform.providers.manage'), HealthPlatformController.suspendProvider);
  router.post('/platform/providers/:providerId/reactivate', requireHealthPermission('platform.providers.manage'), HealthPlatformController.reactivateProvider);
  router.get('/platform/providers/:providerId/audit', requireHealthPermission('platform.providers.manage'), HealthPlatformController.listProviderAudit);
  router.get('/platform/coverage-trends', requireHealthPermission('platform.integration.health'), HealthPlatformController.getCoverageTrends);
  router.get('/platform/grants', requireHealthPermission('platform.tenant_access'), HealthPlatformController.listGrants);
  router.post('/platform/grants', requireHealthPermission('platform.tenant_access'), HealthPlatformController.createGrant);
  router.post('/platform/grants/:id/revoke', requireHealthPermission('platform.tenant_access'), HealthPlatformController.revokeGrant);
  router.get('/platform/audit-events', requireHealthPermission('platform.integration.health'), HealthPlatformController.listAuditEvents);
  router.get('/platform/plans', requireHealthPermission('platform.plans.manage'), HealthPlatformController.listPlanCatalogue);
  router.post('/platform/plans', requireHealthPermission('platform.plans.manage'), HealthPlatformController.createPlanDraft);
  router.post('/platform/plans/versions/:versionId/publish', requireHealthPermission('platform.plans.manage'), HealthPlatformController.publishPlanVersion);
  router.post('/platform/plans/:planId/activate', requireHealthPermission('platform.plans.manage'), HealthPlatformController.activatePlan);
  router.post('/platform/plans/:planId/retire', requireHealthPermission('platform.plans.manage'), HealthPlatformController.retirePlan);
  router.patch('/platform/plans/versions/:versionId', requireHealthPermission('platform.plans.manage'), HealthPlatformController.updatePlanDraft);
  router.get('/platform/catalogue/offerings', requireHealthPermission('platform.plans.manage'), HealthPlatformController.listCatalogueOfferings);
  router.post('/platform/catalogue/offerings', requireHealthPermission('platform.plans.manage'), HealthPlatformController.createCatalogueOffering);
  router.get('/platform/catalogue/offerings/:offeringId', requireHealthPermission('platform.plans.manage'), HealthPlatformController.getCatalogueOffering);
  router.patch('/platform/catalogue/offerings/:offeringId', requireHealthPermission('platform.plans.manage'), HealthPlatformController.updateCatalogueOffering);
  router.post('/platform/catalogue/offerings/:offeringId/status', requireHealthPermission('platform.plans.manage'), HealthPlatformController.setCatalogueOfferingStatus);
  router.post('/platform/catalogue/offerings/:offeringId/services', requireHealthPermission('platform.plans.manage'), HealthPlatformController.addCatalogueService);
  router.post('/platform/catalogue/services/:serviceId/products', requireHealthPermission('platform.plans.manage'), HealthPlatformController.addCatalogueProduct);
  router.post('/platform/catalogue/products/:productId/facilities', requireHealthPermission('platform.plans.manage'), HealthPlatformController.assignCatalogueFacility);
  router.delete('/platform/catalogue/products/:productId/facilities/:facilityId', requireHealthPermission('platform.plans.manage'), HealthPlatformController.removeCatalogueFacility);
  router.get('/platform/finance', requireHealthPermission('platform.integration.health'), HealthPlatformController.getFinanceSnapshot);
  router.get('/platform/finance-command', requireHealthPermission('platform.integration.health'), HealthPlatformController.getFinanceCommand);
  // Profitability & profit-sharing — dedicated finance permissions (not platform.integration.health)
  router.get('/platform/finance/overview', requireHealthPermission('platform.finance.view'), HealthFinanceController.getConsolidatedOverview);
  router.get('/platform/finance/drilldown/:metric', requireHealthPermission('platform.finance.view'), HealthFinanceController.getFinanceDrilldown);
  router.get('/platform/finance/hmo-performance', requireHealthPermission('platform.finance.view'), HealthFinanceController.getHmoPerformance);
  router.get('/platform/finance/plan-profitability', requireHealthPermission('platform.finance.view'), HealthFinanceController.getPlanProfitability);
  router.get('/platform/finance/trends', requireHealthPermission('platform.finance.view'), HealthFinanceController.getFinancialTrends);
  router.get('/platform/finance/agreements', requireHealthPermission('platform.finance.view'), HealthFinanceController.listAgreements);
  router.post('/platform/finance/agreements', requireHealthPermission('platform.finance.manage'), HealthFinanceController.createAgreement);
  router.post('/platform/finance/agreements/:id/approve', requireHealthPermission('platform.agreements.approve'), HealthFinanceController.approveAgreement);
  router.get('/platform/finance/calculations/preview', requireHealthPermission('platform.finance.view'), HealthFinanceController.previewCalculation);
  router.post('/platform/finance/statements', requireHealthPermission('platform.finance.manage'), HealthFinanceController.generateStatement);
  router.get('/platform/finance/statements', requireHealthPermission('platform.finance.view'), HealthFinanceController.listStatements);
  router.post('/platform/finance/statements/:id/approve', requireHealthPermission('platform.statements.approve'), HealthFinanceController.approveStatement);
  router.get('/platform/finance/settlements', requireHealthPermission('platform.finance.view'), HealthFinanceController.listSettlements);
  router.post('/platform/finance/settlements/:id/reconcile', requireHealthPermission('platform.finance.reconcile'), HealthFinanceController.reconcileSettlement);
  router.get('/platform/bank-offerings', requireHealthPermission('platform.integration.health'), HealthPlatformController.listBankOfferings);
  router.get('/platform/claims-overview', requireHealthPermission('platform.integration.health'), HealthPlatformController.getClaimsOverview);
  router.get('/platform/facilities', requireHealthPermission('platform.integration.health'), HealthPlatformController.listFacilities);

  // ─── Tenant Endpoints (Interface B) ──────────────────────────────
  // 1. Dashboard Overview
  router.get('/overview', requireHealthPermission('health.reports.read'), HealthController.getOverview);
  router.get('/reports/overview', requireHealthPermission('health.reports.read'), HealthController.getOverview);

  // 2. Settings
  router.get('/settings', requireHealthPermission('health.settings.manage'), HealthController.getSettings);
  router.post('/settings', requireHealthPermission('health.settings.manage'), HealthController.updateSettings);

  // 3. Providers & Plans
  router.get('/providers', HealthController.listProviders);
  router.get('/plans', HealthController.listPlans);
  router.get('/providers/:providerId/plans', HealthController.listPlans);
  router.get('/tenant-offers', HealthController.listTenantOffers);
  router.get('/plans/offers', HealthController.listTenantOffers);
  router.post('/tenant-offers', requireHealthPermission('health.plans.manage'), HealthController.configureTenantOffer);
  router.post('/plans/offers', requireHealthPermission('health.plans.manage'), HealthController.configureTenantOffer);
  router.get('/facilities', HealthController.listFacilities);

  // 4. Members
  router.get('/members', requireHealthPermission('health.members.read'), HealthController.listMembers);
  router.post('/members/student', requireHealthPermission('health.members.manage'), HealthController.enrolStudent);
  router.post('/members/staff', requireHealthPermission('health.hr_admin'), HealthController.enrolStaff);

  // 5. Guardians & Family Portal
  router.post('/guardians/invite', requireHealthPermission('health.guardians.manage'), HealthController.inviteGuardian);
  router.post('/guardians/accept', HealthController.acceptGuardianInvitation);
  router.post('/guardians/:linkId/verify', requireHealthPermission('health.guardians.manage'), HealthController.verifyGuardianRelationship);
  router.post('/guardians/links/:linkId/verify', requireHealthPermission('health.guardians.manage'), HealthController.verifyGuardianRelationship);
  router.get('/guardian/children', HealthController.listGuardianChildren);

  // 6. Enrolments & Policies
  router.get('/enrolments', requireHealthPermission('health.members.read'), HealthController.listEnrolments);
  router.post('/enrolments', requireHealthPermission('health.enrolments.manage'), HealthController.createEnrolment);
  router.post('/enrolments/:id/verify', requireHealthPermission('health.enrolments.verify'), HealthController.verifyEnrolment);
  router.post('/enrolments/:id/simulate-sandbox-activation', requireHealthPermission('health.enrolments.manage'), HealthController.simulateSandboxActivation);
  router.post('/enrolments/:id/activate-policy', requireHealthPermission('health.enrolments.manage'), HealthController.simulateSandboxActivation);

  // 7. Billing & Payments
  router.post('/invoices', requireHealthPermission('health.billing.manage'), HealthController.issueInvoice);
  router.post('/billing/invoices', requireHealthPermission('health.billing.manage'), HealthController.issueInvoice);
  router.post('/invoices/:invoiceId/pay', HealthController.initiatePayment);
  router.post('/billing/invoices/:invoiceId/initiate-payment', HealthController.initiatePayment);
  router.post('/payments/confirm', requireHealthPermission('health.billing.manage'), HealthController.confirmPayment);

  // 8. Claims (administrative status records — not clinical payloads; settlement ≠ payout)
  router.get('/claims', requireHealthPermission('health.claims.read'), HealthController.listClaims);
  router.get('/claims/:id/history', requireHealthPermission('health.claims.read'), HealthController.listClaimHistory);
  router.get('/claims/:reference', requireHealthPermission('health.claims.read'), HealthController.lookupClaim);
  router.post('/claims', requireHealthPermission('health.claims.manage'), HealthController.submitClaim);
  router.post('/claims/:id/approve', requireHealthPermission('health.claims.manage'), HealthController.approveClaim);
  router.post('/claims/:id/reject', requireHealthPermission('health.claims.manage'), HealthController.rejectClaim);
  router.post('/claims/:id/settle', requireHealthPermission('health.claims.manage'), HealthController.settleClaim);

  // 9. Institution–provider affiliation (tenant cannot create global providers)
  router.get('/affiliations', requireHealthPermission('health.settings.manage'), HealthController.listAffiliations);
  router.post('/affiliations', requireHealthPermission('health.settings.manage'), HealthController.requestAffiliation);
  router.get('/eligible-providers', requireHealthPermission('health.settings.manage'), HealthController.listEligibleProviders);

  return router;
}

export function attachHealthInsuranceRoutes(app: any): void {
  if (!app || app._healthInsuranceRoutesAttached) return;
  app._healthInsuranceRoutesAttached = true;
  app.use('/api/v1/health-insurance', createHealthInsuranceRouter());
  app.use('/api/agent/hmo', createHmoPortalRouter());
  console.log('[HealthInsurance] Routes attached at /api/v1/health-insurance and /api/agent/hmo');
}
