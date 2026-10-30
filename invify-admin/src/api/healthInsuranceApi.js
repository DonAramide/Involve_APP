// invify-admin/src/api/healthInsuranceApi.js
import { api } from './index';

function platformReasonHeader(reason) {
  const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('hw_platform_reason') : '';
  const value = String(reason || stored || '').trim();
  return { 'x-platform-reason': value };
}

export const healthInsuranceApi = {
  // Settings & Configuration
  getSettings: () => api.get('/api/v1/health-insurance/settings'),
  updateSettings: (data) => api.patch('/api/v1/health-insurance/settings', data),

  // Executive & Operational Metrics
  getOverviewMetrics: () => api.get('/api/v1/health-insurance/reports/overview'),

  // Providers & Plans (tenant-facing: verified providers only)
  getProviders: () => api.get('/api/v1/health-insurance/providers'),
  /** Global HMO registration is platform-only. Do not call from institution admins. */
  createProvider: (data, reason) => api.post('/api/v1/health-insurance/platform/providers', data, {
    headers: platformReasonHeader(reason)
  }),
  getPlans: (providerId) => api.get(`/api/v1/health-insurance/providers/${providerId}/plans`),
  createPlan: (providerId, data) => api.post(`/api/v1/health-insurance/providers/${providerId}/plans`, data),
  createPlanVersion: (planId, data) => api.post(`/api/v1/health-insurance/plans/${planId}/versions`, data),
  publishPlanVersion: (versionId) => api.post(`/api/v1/health-insurance/plans/versions/${versionId}/publish`),
  getTenantOffers: () => api.get('/api/v1/health-insurance/plans/offers'),
  configureOffer: (data) => api.post('/api/v1/health-insurance/plans/offers', data),

  // Facilities
  getFacilities: (params) => api.get('/api/v1/health-insurance/facilities', { params }),
  createFacility: (data) => api.post('/api/v1/health-insurance/facilities', data),

  // Members & Roster
  getMembers: (params) => api.get('/api/v1/health-insurance/members', { params }),
  createMember: (data) => api.post('/api/v1/health-insurance/members', data),

  // Enrolments & Policies
  getEnrolments: (params) => api.get('/api/v1/health-insurance/enrolments', { params }),
  createEnrolment: (data) => api.post('/api/v1/health-insurance/enrolments', data),
  verifyEnrolment: (enrolmentId, data) => api.post(`/api/v1/health-insurance/enrolments/${enrolmentId}/verify`, data),
  activatePolicy: (enrolmentId, data) => api.post(`/api/v1/health-insurance/enrolments/${enrolmentId}/activate-policy`, data),
  getPolicies: (params) => api.get('/api/v1/health-insurance/policies', { params }),

  // Guardians
  inviteGuardian: (data) => api.post('/api/v1/health-insurance/guardians/invite', data),
  verifyGuardianLink: (linkId, data) => api.post(`/api/v1/health-insurance/guardians/links/${linkId}/verify`, data),

  // Premium Invoicing & Payments
  getInvoices: (params) => api.get('/api/v1/health-insurance/billing/invoices', { params }),
  generateInvoice: (data) => api.post('/api/v1/health-insurance/billing/invoices', data),
  initiatePayment: (invoiceId, data) => api.post(`/api/v1/health-insurance/billing/invoices/${invoiceId}/initiate-payment`, data),
  getPayments: (params) => api.get('/api/v1/health-insurance/billing/payments', { params }),

  // Claims (administrative status; settle ≠ payout)
  getClaims: (params) => api.get('/api/v1/health-insurance/claims', { params }),
  submitClaim: (data) => api.post('/api/v1/health-insurance/claims', data),
  approveClaim: (claimId, data) => api.post(`/api/v1/health-insurance/claims/${claimId}/approve`, data || {}),
  rejectClaim: (claimId, data) => api.post(`/api/v1/health-insurance/claims/${claimId}/reject`, data),
  settleClaim: (claimId, data) => api.post(`/api/v1/health-insurance/claims/${claimId}/settle`, data || {}),
  getClaimHistory: (claimId) => api.get(`/api/v1/health-insurance/claims/${claimId}/history`),
  // Status lookup by claim reference (no /claims/sync route — use GET /claims/:reference)
  lookupClaimStatus: (claimReference) => api.get(`/api/v1/health-insurance/claims/${encodeURIComponent(claimReference)}`),

  // Institution–provider affiliation
  listEligibleProviders: () => api.get('/api/v1/health-insurance/eligible-providers'),
  listAffiliations: () => api.get('/api/v1/health-insurance/affiliations'),
  requestAffiliation: (data) => api.post('/api/v1/health-insurance/affiliations', data),

  // Platform Governance (Super Admin Interface C)
  getPlatformOverview: (reason) => api.get('/api/v1/health-insurance/platform/overview', {
    headers: platformReasonHeader(reason)
  }),
  getPlatformTenants: (params, reason) => api.get('/api/v1/health-insurance/platform/tenants', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformTenantDetail: (tenantId, reason) => api.get(`/api/v1/health-insurance/platform/tenants/${tenantId}`, {
    headers: platformReasonHeader(reason)
  }),
  getPlatformInstitutionDetail: (institutionId, reason) => api.get(`/api/v1/health-insurance/platform/institutions/${institutionId}`, {
    headers: platformReasonHeader(reason)
  }),
  getPlatformMembers: (params, reason) => api.get('/api/v1/health-insurance/platform/members', {
    params,
    headers: platformReasonHeader(reason)
  }),
  setTenantParticipation: (tenantId, data, reason) => api.post(`/api/v1/health-insurance/platform/tenants/${tenantId}/participation`, data, {
    headers: platformReasonHeader(reason)
  }),
  assignTenantProvider: (tenantId, data, reason) => api.post(`/api/v1/health-insurance/platform/tenants/${tenantId}/assignment`, data, {
    headers: platformReasonHeader(reason)
  }),
  getProvidersHealth: (reason) => api.get('/api/v1/health-insurance/platform/providers/health', {
    headers: platformReasonHeader(reason)
  }),
  getCoverageTrends: (reason) => api.get('/api/v1/health-insurance/platform/coverage-trends', {
    headers: platformReasonHeader(reason)
  }),
  getPlatformGrants: (params, reason) => api.get('/api/v1/health-insurance/platform/grants', {
    params,
    headers: platformReasonHeader(reason)
  }),
  listGrantOperators: () => api.get('/api/v1/health-insurance/platform/grant-operators'),
  createPlatformGrant: (data, reason) => api.post('/api/v1/health-insurance/platform/grants', data, {
    headers: platformReasonHeader(reason)
  }),
  revokePlatformGrant: (grantId, data, reason) => api.post(`/api/v1/health-insurance/platform/grants/${grantId}/revoke`, data, {
    headers: platformReasonHeader(reason)
  }),
  getPlatformAuditEvents: (params, reason) => api.get('/api/v1/health-insurance/platform/audit-events', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getMyGrantStatus: () => api.get('/api/v1/health-insurance/platform/my-grant-status'),
  issuePlatformEntitlement: (data, reason) => api.post('/api/v1/health-insurance/platform/entitlements', data, {
    headers: platformReasonHeader(reason)
  }),
  suspendPlatformEntitlement: (permission, reason) => api.post(`/api/v1/health-insurance/platform/entitlements/${encodeURIComponent(permission)}/suspend`, {}, {
    headers: platformReasonHeader(reason)
  }),
  revokePlatformEntitlement: (permission, reason) => api.post(`/api/v1/health-insurance/platform/entitlements/${encodeURIComponent(permission)}/revoke`, {}, {
    headers: platformReasonHeader(reason)
  }),
  selfActivateGrant: (data) => api.post('/api/v1/health-insurance/platform/grants/self-activate', data),
  getPlatformRegistry: (reason, params) => api.get('/api/v1/health-insurance/platform/providers', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformProviderStatistics: (reason) => api.get('/api/v1/health-insurance/platform/providers/statistics', {
    headers: platformReasonHeader(reason)
  }),
  getPlatformProviderDetail: (providerId, reason) => api.get(`/api/v1/health-insurance/platform/providers/${providerId}`, {
    headers: platformReasonHeader(reason)
  }),
  registerPlatformProvider: (data, reason) => api.post('/api/v1/health-insurance/platform/providers', data, {
    headers: platformReasonHeader(reason)
  }),
  updatePlatformProvider: (providerId, data, reason) => api.patch(`/api/v1/health-insurance/platform/providers/${providerId}`, data, {
    headers: platformReasonHeader(reason)
  }),
  approvePlatformProvider: (providerId, reason) => api.post(`/api/v1/health-insurance/platform/providers/${providerId}/approve`, {}, {
    headers: platformReasonHeader(reason)
  }),
  rejectPlatformProvider: (providerId, data, reason) => api.post(`/api/v1/health-insurance/platform/providers/${providerId}/reject`, data, {
    headers: platformReasonHeader(reason)
  }),
  suspendPlatformProvider: (providerId, data, reason) => api.post(`/api/v1/health-insurance/platform/providers/${providerId}/suspend`, data, {
    headers: platformReasonHeader(reason)
  }),
  reactivatePlatformProvider: (providerId, data, reason) => api.post(`/api/v1/health-insurance/platform/providers/${providerId}/reactivate`, data || {}, {
    headers: platformReasonHeader(reason)
  }),
  getPlatformProviderAudit: (providerId, params, reason) => api.get(`/api/v1/health-insurance/platform/providers/${providerId}/audit`, {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformCatalogue: (reason) => api.get('/api/v1/health-insurance/platform/plans', {
    headers: platformReasonHeader(reason)
  }),
  createPlatformPlanDraft: (data, reason) => api.post('/api/v1/health-insurance/platform/plans', data, {
    headers: platformReasonHeader(reason)
  }),
  publishPlatformPlanVersion: (versionId, data, reason) => api.post(`/api/v1/health-insurance/platform/plans/versions/${versionId}/publish`, data, {
    headers: platformReasonHeader(reason)
  }),
  activatePlatformPlan: (planId, data, reason) => api.post(`/api/v1/health-insurance/platform/plans/${planId}/activate`, data, {
    headers: platformReasonHeader(reason)
  }),
  retirePlatformPlan: (planId, data, reason) => api.post(`/api/v1/health-insurance/platform/plans/${planId}/retire`, data, {
    headers: platformReasonHeader(reason)
  }),
  updatePlatformPlanDraft: (versionId, data, reason) => api.patch(`/api/v1/health-insurance/platform/plans/versions/${versionId}`, data, {
    headers: platformReasonHeader(reason)
  }),
  getPlatformFinance: (reason) => api.get('/api/v1/health-insurance/platform/finance', {
    headers: platformReasonHeader(reason)
  }),
  getPlatformFinanceCommand: (params, reason) => api.get('/api/v1/health-insurance/platform/finance-command', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformFinanceOverview: (params, reason) => api.get('/api/v1/health-insurance/platform/finance/overview', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformFinanceTrends: (params, reason) => api.get('/api/v1/health-insurance/platform/finance/trends', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformFinanceAgreements: (params, reason) => api.get('/api/v1/health-insurance/platform/finance/agreements', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformFinanceStatements: (params, reason) => api.get('/api/v1/health-insurance/platform/finance/statements', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformFinanceSettlements: (params, reason) => api.get('/api/v1/health-insurance/platform/finance/settlements', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformBankOfferings: (params, reason) => api.get('/api/v1/health-insurance/platform/bank-offerings', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getPlatformClaimsOverview: (reason) => api.get('/api/v1/health-insurance/platform/claims-overview', {
    headers: platformReasonHeader(reason)
  }),
  getPlatformFacilities: (providerId, reason) => api.get('/api/v1/health-insurance/platform/facilities', {
    params: providerId ? { providerId } : {},
    headers: platformReasonHeader(reason)
  }),
  listInvifyOfferings: (params, reason) => api.get('/api/v1/health-insurance/platform/catalogue/offerings', {
    params,
    headers: platformReasonHeader(reason)
  }),
  getInvifyOffering: (offeringId, reason) => api.get(`/api/v1/health-insurance/platform/catalogue/offerings/${offeringId}`, {
    headers: platformReasonHeader(reason)
  }),
  createInvifyOffering: (data, reason) => api.post('/api/v1/health-insurance/platform/catalogue/offerings', data, {
    headers: platformReasonHeader(reason)
  }),
  updateInvifyOffering: (offeringId, data, reason) => api.patch(`/api/v1/health-insurance/platform/catalogue/offerings/${offeringId}`, data, {
    headers: platformReasonHeader(reason)
  }),
  setInvifyOfferingStatus: (offeringId, data, reason) => api.post(`/api/v1/health-insurance/platform/catalogue/offerings/${offeringId}/status`, data, {
    headers: platformReasonHeader(reason)
  }),
  addInvifyService: (offeringId, data, reason) => api.post(`/api/v1/health-insurance/platform/catalogue/offerings/${offeringId}/services`, data, {
    headers: platformReasonHeader(reason)
  }),
  addInvifyProduct: (serviceId, data, reason) => api.post(`/api/v1/health-insurance/platform/catalogue/services/${serviceId}/products`, data, {
    headers: platformReasonHeader(reason)
  }),
  assignInvifyProductFacility: (productId, data, reason) => api.post(`/api/v1/health-insurance/platform/catalogue/products/${productId}/facilities`, data, {
    headers: platformReasonHeader(reason)
  })
};

export default healthInsuranceApi;
