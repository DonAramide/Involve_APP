"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHmoPortalRouter = createHmoPortalRouter;
exports.createHealthInsuranceRouter = createHealthInsuranceRouter;
exports.attachHealthInsuranceRoutes = attachHealthInsuranceRoutes;
// invify-backend/src/modules/health-insurance/register-routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const health_flag_guard_1 = require("./guards/health-flag.guard");
const health_permission_guard_1 = require("./guards/health-permission.guard");
const health_controller_1 = require("./controllers/health.controller");
const health_platform_controller_1 = require("./controllers/health-platform.controller");
const hmo_portal_controller_1 = require("./controllers/hmo-portal.controller");
const hmo_institution_guard_1 = require("./guards/hmo-institution.guard");
function createHmoPortalRouter() {
    const hmoRouter = (0, express_1.Router)();
    hmoRouter.use(auth_middleware_1.authenticate);
    // 1. Overview & KPIs
    hmoRouter.get('/overview', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.dashboard.view'), hmo_portal_controller_1.HmoPortalController.getOverview);
    // 2. Organization Profile & License Verification
    hmoRouter.get('/profile', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.dashboard.view'), hmo_portal_controller_1.HmoPortalController.getProfile);
    hmoRouter.patch('/profile', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.profile.manage'), hmo_portal_controller_1.HmoPortalController.updateProfile);
    // 3. School & Employer Network
    hmoRouter.get('/schools', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.schools.view'), hmo_portal_controller_1.HmoPortalController.listSchools);
    hmoRouter.patch('/schools/:tenantId', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.schools.manage'), hmo_portal_controller_1.HmoPortalController.updateSchoolOnboarding);
    // 4. Insurance Plans & Versioned Benefits
    hmoRouter.get('/plans', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.plans.view'), hmo_portal_controller_1.HmoPortalController.listPlans);
    hmoRouter.post('/plans', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.plans.manage'), hmo_portal_controller_1.HmoPortalController.createOrVersionPlan);
    hmoRouter.patch('/plans/:planId/status', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.plans.manage'), hmo_portal_controller_1.HmoPortalController.updatePlanStatus);
    // 5. Member & Enrollment Management
    hmoRouter.get('/enrollments', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.members.view'), hmo_portal_controller_1.HmoPortalController.listEnrollments);
    hmoRouter.post('/enrollments/:id/adjudicate', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.members.manage'), hmo_portal_controller_1.HmoPortalController.adjudicateEnrollment);
    // 6. Excel / CSV Integration Centre
    hmoRouter.get('/excel/mappings', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.batches.view'), hmo_portal_controller_1.HmoPortalController.listExportMappings);
    hmoRouter.post('/excel/mappings', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.batches.export'), hmo_portal_controller_1.HmoPortalController.saveExportMapping);
    hmoRouter.get('/excel/batches', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.batches.view'), hmo_portal_controller_1.HmoPortalController.listBatches);
    hmoRouter.post('/excel/batches', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.batches.export'), hmo_portal_controller_1.HmoPortalController.createBatch);
    hmoRouter.get('/excel/batches/:batchId/export', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.batches.export'), hmo_portal_controller_1.HmoPortalController.exportBatchCsv);
    hmoRouter.post('/excel/reconcile', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.batches.reconcile'), hmo_portal_controller_1.HmoPortalController.reconcileResponseSheet);
    // 7. Provider Network (Hospitals, Clinics, Pharmacies, Labs)
    hmoRouter.get('/facilities', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.providers.view'), hmo_portal_controller_1.HmoPortalController.listFacilities);
    hmoRouter.post('/facilities', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.providers.manage'), hmo_portal_controller_1.HmoPortalController.saveFacility);
    // 8. Pre-Authorization & Claims
    hmoRouter.get('/claims', (0, hmo_institution_guard_1.requireHmoInstitution)(['hmo.claims.view', 'hmo.preauth.view']), hmo_portal_controller_1.HmoPortalController.listClaimsAndPreAuths);
    hmoRouter.post('/claims/:id/adjudicate', (0, hmo_institution_guard_1.requireHmoInstitution)(['hmo.claims.adjudicate', 'hmo.preauth.adjudicate']), hmo_portal_controller_1.HmoPortalController.adjudicateClaimOrPreAuth);
    // 9. Billing & Premium Reconciliation
    hmoRouter.get('/billing', (0, hmo_institution_guard_1.requireHmoInstitution)('hmo.billing.view'), hmo_portal_controller_1.HmoPortalController.getBillingSummary);
    // 10. HMO Users, RBAC & Audit Logs
    hmoRouter.get('/users-audit', (0, hmo_institution_guard_1.requireHmoInstitution)(['hmo.audit.view', 'hmo.users.manage', 'hmo.dashboard.view']), hmo_portal_controller_1.HmoPortalController.listUsersAndAudit);
    return hmoRouter;
}
function createHealthInsuranceRouter() {
    const router = (0, express_1.Router)();
    // Webhook ingress: Authenticated via cryptographic HMAC signature, not Supabase JWT
    router.post('/provider-webhooks/:providerCode', health_controller_1.HealthController.handleProviderWebhook);
    // Mount HMO Institution Portal sub-router (enforces its own classification + feature flag check)
    router.use('/hmo-portal', createHmoPortalRouter());
    // All other endpoints require feature flag check AND Supabase user authentication
    router.use(health_flag_guard_1.requireHealthInsuranceEnabled);
    router.use(auth_middleware_1.authenticate);
    // ─── Platform Super-Admin Governance (Interface C) ───────────────
    // Operator grant check and self-activation for SUPER_ADMIN
    router.get('/platform/my-grant-status', health_platform_controller_1.HealthPlatformController.getMyGrantStatus);
    router.get('/platform/grant-status', health_platform_controller_1.HealthPlatformController.getMyGrantStatus);
    router.post('/platform/grants/self-activate', health_platform_controller_1.HealthPlatformController.selfActivateGrant);
    // Durable entitlement. Not gated by platform.tenant_access: that grant does not
    // exist for any operator, so using it here would make first issuance impossible.
    // The controller requires a different active super_admin, the pinned holder,
    // and x-platform-reason. The holder cannot call these for their own row.
    router.post('/platform/entitlements', health_platform_controller_1.HealthPlatformController.issueEntitlement);
    router.post('/platform/entitlements/:permission/suspend', health_platform_controller_1.HealthPlatformController.suspendEntitlement);
    router.post('/platform/entitlements/:permission/revoke', health_platform_controller_1.HealthPlatformController.revokeEntitlement);
    router.get('/platform/grant-operators', health_platform_controller_1.HealthPlatformController.listGrantOperators);
    // Protected Platform Endpoints (Strictly require explicit platform.* grants & justification)
    router.get('/platform/overview', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.getOverview);
    router.get('/platform/tenants', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.listTenants);
    router.get('/platform/tenants/:tenantId', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.getTenantDetail);
    router.get('/platform/institutions/:institutionId', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.getInstitutionDetail);
    router.get('/platform/members', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.listMembers);
    router.post('/platform/tenants/:tenantId/participation', (0, health_permission_guard_1.requireHealthPermission)('platform.tenants.onboard'), health_platform_controller_1.HealthPlatformController.setTenantParticipation);
    router.get('/platform/providers', (0, health_permission_guard_1.requireHealthPermission)('platform.providers.manage'), health_platform_controller_1.HealthPlatformController.listProviderRegistry);
    router.get('/platform/providers/health', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.getProvidersHealth);
    router.get('/platform/coverage-trends', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.getCoverageTrends);
    router.get('/platform/grants', (0, health_permission_guard_1.requireHealthPermission)('platform.tenant_access'), health_platform_controller_1.HealthPlatformController.listGrants);
    router.post('/platform/grants', (0, health_permission_guard_1.requireHealthPermission)('platform.tenant_access'), health_platform_controller_1.HealthPlatformController.createGrant);
    router.post('/platform/grants/:id/revoke', (0, health_permission_guard_1.requireHealthPermission)('platform.tenant_access'), health_platform_controller_1.HealthPlatformController.revokeGrant);
    router.get('/platform/audit-events', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.listAuditEvents);
    router.get('/platform/plans', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.listPlanCatalogue);
    router.post('/platform/plans', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.createPlanDraft);
    router.post('/platform/plans/versions/:versionId/publish', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.publishPlanVersion);
    router.post('/platform/plans/:planId/activate', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.activatePlan);
    router.post('/platform/plans/:planId/retire', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.retirePlan);
    router.patch('/platform/plans/versions/:versionId', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.updatePlanDraft);
    router.get('/platform/catalogue/offerings', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.listCatalogueOfferings);
    router.post('/platform/catalogue/offerings', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.createCatalogueOffering);
    router.get('/platform/catalogue/offerings/:offeringId', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.getCatalogueOffering);
    router.patch('/platform/catalogue/offerings/:offeringId', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.updateCatalogueOffering);
    router.post('/platform/catalogue/offerings/:offeringId/status', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.setCatalogueOfferingStatus);
    router.post('/platform/catalogue/offerings/:offeringId/services', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.addCatalogueService);
    router.post('/platform/catalogue/services/:serviceId/products', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.addCatalogueProduct);
    router.post('/platform/catalogue/products/:productId/facilities', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.assignCatalogueFacility);
    router.delete('/platform/catalogue/products/:productId/facilities/:facilityId', (0, health_permission_guard_1.requireHealthPermission)('platform.plans.manage'), health_platform_controller_1.HealthPlatformController.removeCatalogueFacility);
    router.get('/platform/finance', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.getFinanceSnapshot);
    router.get('/platform/finance-command', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.getFinanceCommand);
    router.get('/platform/facilities', (0, health_permission_guard_1.requireHealthPermission)('platform.integration.health'), health_platform_controller_1.HealthPlatformController.listFacilities);
    // ─── Tenant Endpoints (Interface B) ──────────────────────────────
    // 1. Dashboard Overview
    router.get('/overview', (0, health_permission_guard_1.requireHealthPermission)('health.reports.read'), health_controller_1.HealthController.getOverview);
    router.get('/reports/overview', (0, health_permission_guard_1.requireHealthPermission)('health.reports.read'), health_controller_1.HealthController.getOverview);
    // 2. Settings
    router.get('/settings', (0, health_permission_guard_1.requireHealthPermission)('health.settings.manage'), health_controller_1.HealthController.getSettings);
    router.post('/settings', (0, health_permission_guard_1.requireHealthPermission)('health.settings.manage'), health_controller_1.HealthController.updateSettings);
    // 3. Providers & Plans
    router.get('/providers', health_controller_1.HealthController.listProviders);
    router.get('/plans', health_controller_1.HealthController.listPlans);
    router.get('/providers/:providerId/plans', health_controller_1.HealthController.listPlans);
    router.get('/tenant-offers', health_controller_1.HealthController.listTenantOffers);
    router.get('/plans/offers', health_controller_1.HealthController.listTenantOffers);
    router.post('/tenant-offers', (0, health_permission_guard_1.requireHealthPermission)('health.plans.manage'), health_controller_1.HealthController.configureTenantOffer);
    router.post('/plans/offers', (0, health_permission_guard_1.requireHealthPermission)('health.plans.manage'), health_controller_1.HealthController.configureTenantOffer);
    router.get('/facilities', health_controller_1.HealthController.listFacilities);
    // 4. Members
    router.get('/members', (0, health_permission_guard_1.requireHealthPermission)('health.members.read'), health_controller_1.HealthController.listMembers);
    router.post('/members/student', (0, health_permission_guard_1.requireHealthPermission)('health.members.manage'), health_controller_1.HealthController.enrolStudent);
    router.post('/members/staff', (0, health_permission_guard_1.requireHealthPermission)('health.hr_admin'), health_controller_1.HealthController.enrolStaff);
    // 5. Guardians & Family Portal
    router.post('/guardians/invite', (0, health_permission_guard_1.requireHealthPermission)('health.guardians.manage'), health_controller_1.HealthController.inviteGuardian);
    router.post('/guardians/accept', health_controller_1.HealthController.acceptGuardianInvitation);
    router.post('/guardians/:linkId/verify', (0, health_permission_guard_1.requireHealthPermission)('health.guardians.manage'), health_controller_1.HealthController.verifyGuardianRelationship);
    router.post('/guardians/links/:linkId/verify', (0, health_permission_guard_1.requireHealthPermission)('health.guardians.manage'), health_controller_1.HealthController.verifyGuardianRelationship);
    router.get('/guardian/children', health_controller_1.HealthController.listGuardianChildren);
    // 6. Enrolments & Policies
    router.get('/enrolments', (0, health_permission_guard_1.requireHealthPermission)('health.members.read'), health_controller_1.HealthController.listEnrolments);
    router.post('/enrolments', (0, health_permission_guard_1.requireHealthPermission)('health.enrolments.manage'), health_controller_1.HealthController.createEnrolment);
    router.post('/enrolments/:id/verify', (0, health_permission_guard_1.requireHealthPermission)('health.enrolments.verify'), health_controller_1.HealthController.verifyEnrolment);
    router.post('/enrolments/:id/simulate-sandbox-activation', (0, health_permission_guard_1.requireHealthPermission)('health.enrolments.manage'), health_controller_1.HealthController.simulateSandboxActivation);
    router.post('/enrolments/:id/activate-policy', (0, health_permission_guard_1.requireHealthPermission)('health.enrolments.manage'), health_controller_1.HealthController.simulateSandboxActivation);
    // 7. Billing & Payments
    router.post('/invoices', (0, health_permission_guard_1.requireHealthPermission)('health.billing.manage'), health_controller_1.HealthController.issueInvoice);
    router.post('/billing/invoices', (0, health_permission_guard_1.requireHealthPermission)('health.billing.manage'), health_controller_1.HealthController.issueInvoice);
    router.post('/invoices/:invoiceId/pay', health_controller_1.HealthController.initiatePayment);
    router.post('/billing/invoices/:invoiceId/initiate-payment', health_controller_1.HealthController.initiatePayment);
    router.post('/payments/confirm', (0, health_permission_guard_1.requireHealthPermission)('health.billing.manage'), health_controller_1.HealthController.confirmPayment);
    // 8. Claims
    router.get('/claims', (0, health_permission_guard_1.requireHealthPermission)('health.claims.read'), health_controller_1.HealthController.listClaims);
    router.get('/claims/:reference', (0, health_permission_guard_1.requireHealthPermission)('health.claims.read'), health_controller_1.HealthController.lookupClaim);
    return router;
}
function attachHealthInsuranceRoutes(app) {
    if (!app || app._healthInsuranceRoutesAttached)
        return;
    app._healthInsuranceRoutesAttached = true;
    app.use('/api/v1/health-insurance', createHealthInsuranceRouter());
    app.use('/api/agent/hmo', createHmoPortalRouter());
    console.log('[HealthInsurance] Routes attached at /api/v1/health-insurance and /api/agent/hmo');
}
//# sourceMappingURL=register-routes.js.map