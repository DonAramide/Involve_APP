// invify-backend/src/modules/health-insurance/register-routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireHealthInsuranceEnabled } from './guards/health-flag.guard';
import { requireHealthPermission } from './guards/health-permission.guard';
import { requireGuardianLink } from './guards/guardian-access.guard';
import { HealthController } from './controllers/health.controller';
import { HealthPlatformController } from './controllers/health-platform.controller';
import { HmoPortalController } from './controllers/hmo-portal.controller';
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
  router.post('/platform/grants/self-activate', HealthPlatformController.selfActivateGrant);

  // Protected Platform Endpoints (Strictly require explicit platform.* grants & justification)
  router.get('/platform/overview', requireHealthPermission('platform.integration.health'), HealthPlatformController.getOverview);
  router.get('/platform/tenants', requireHealthPermission('platform.integration.health'), HealthPlatformController.listTenants);
  router.get('/platform/providers/health', requireHealthPermission('platform.integration.health'), HealthPlatformController.getProvidersHealth);
  router.get('/platform/coverage-trends', requireHealthPermission('platform.integration.health'), HealthPlatformController.getCoverageTrends);
  router.get('/platform/grants', requireHealthPermission('platform.tenant_access'), HealthPlatformController.listGrants);
  router.post('/platform/grants', requireHealthPermission('platform.tenant_access'), HealthPlatformController.createGrant);
  router.post('/platform/grants/:id/revoke', requireHealthPermission('platform.tenant_access'), HealthPlatformController.revokeGrant);
  router.get('/platform/audit-events', requireHealthPermission('platform.integration.health'), HealthPlatformController.listAuditEvents);

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

  // 8. Claims
  router.get('/claims', requireHealthPermission('health.claims.read'), HealthController.listClaims);
  router.get('/claims/:reference', requireHealthPermission('health.claims.read'), HealthController.lookupClaim);

  return router;
}

export function attachHealthInsuranceRoutes(app: any): void {
  if (!app || app._healthInsuranceRoutesAttached) return;
  app._healthInsuranceRoutesAttached = true;
  app.use('/api/v1/health-insurance', createHealthInsuranceRouter());
  app.use('/api/agent/hmo', createHmoPortalRouter());
  console.log('[HealthInsurance] Routes attached at /api/v1/health-insurance and /api/agent/hmo');
}
