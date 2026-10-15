// invify-backend/src/modules/health-insurance/register-routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireHealthInsuranceEnabled } from './guards/health-flag.guard';
import { requireHealthPermission } from './guards/health-permission.guard';
import { requireGuardianLink } from './guards/guardian-access.guard';
import { HealthController } from './controllers/health.controller';

export function createHealthInsuranceRouter(): Router {
  const router = Router();

  // Webhook ingress: Authenticated via cryptographic HMAC signature, not Supabase JWT
  router.post('/provider-webhooks/:providerCode', HealthController.handleProviderWebhook);

  // All other endpoints require feature flag check AND Supabase user authentication
  router.use(requireHealthInsuranceEnabled);
  router.use(authenticate);

  // 1. Dashboard Overview
  router.get('/overview', requireHealthPermission('health.reports.read'), HealthController.getOverview);

  // 2. Settings
  router.get('/settings', requireHealthPermission('health.settings.manage'), HealthController.getSettings);
  router.post('/settings', requireHealthPermission('health.settings.manage'), HealthController.updateSettings);

  // 3. Providers & Plans
  router.get('/providers', HealthController.listProviders);
  router.get('/plans', HealthController.listPlans);
  router.get('/tenant-offers', HealthController.listTenantOffers);
  router.post('/tenant-offers', requireHealthPermission('health.plans.manage'), HealthController.configureTenantOffer);
  router.get('/facilities', HealthController.listFacilities);

  // 4. Members
  router.get('/members', requireHealthPermission('health.members.read'), HealthController.listMembers);
  router.post('/members/student', requireHealthPermission('health.members.manage'), HealthController.enrolStudent);
  router.post('/members/staff', requireHealthPermission('health.hr_admin'), HealthController.enrolStaff);

  // 5. Guardians & Family Portal
  router.post('/guardians/invite', requireHealthPermission('health.guardians.manage'), HealthController.inviteGuardian);
  router.post('/guardians/accept', HealthController.acceptGuardianInvitation);
  router.post('/guardians/:linkId/verify', requireHealthPermission('health.guardians.manage'), HealthController.verifyGuardianRelationship);
  router.get('/guardian/children', HealthController.listGuardianChildren);

  // 6. Enrolments & Policies
  router.get('/enrolments', requireHealthPermission('health.members.read'), HealthController.listEnrolments);
  router.post('/enrolments', requireHealthPermission('health.enrolments.manage'), HealthController.createEnrolment);
  router.post('/enrolments/:id/verify', requireHealthPermission('health.enrolments.verify'), HealthController.verifyEnrolment);
  router.post('/enrolments/:id/simulate-sandbox-activation', requireHealthPermission('health.enrolments.manage'), HealthController.simulateSandboxActivation);

  // 7. Billing & Payments
  router.post('/invoices', requireHealthPermission('health.billing.manage'), HealthController.issueInvoice);
  router.post('/invoices/:invoiceId/pay', HealthController.initiatePayment);
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
  console.log('[HealthInsurance] Routes attached at /api/v1/health-insurance');
}
