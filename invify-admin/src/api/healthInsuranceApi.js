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

  // Providers & Plans
  getProviders: () => api.get('/api/v1/health-insurance/providers'),
  createProvider: (data) => api.post('/api/v1/health-insurance/providers', data),
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

  // Claims
  getClaims: (params) => api.get('/api/v1/health-insurance/claims', { params }),
  syncClaimStatus: (claimId) => api.post(`/api/v1/health-insurance/claims/sync`, { claimId }),

  // Platform Governance (Super Admin Interface C)
  getPlatformOverview: (reason) => api.get('/api/v1/health-insurance/platform/overview', {
    headers: platformReasonHeader(reason)
  }),
  getPlatformTenants: (params, reason) => api.get('/api/v1/health-insurance/platform/tenants', {
    params,
    headers: platformReasonHeader(reason)
  }),
  setTenantParticipation: (tenantId, data, reason) => api.post(`/api/v1/health-insurance/platform/tenants/${tenantId}/participation`, data, {
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
  getPlatformRegistry: (reason) => api.get('/api/v1/health-insurance/platform/providers', {
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
  getPlatformFacilities: (providerId, reason) => api.get('/api/v1/health-insurance/platform/facilities', {
    params: providerId ? { providerId } : {},
    headers: platformReasonHeader(reason)
  })
};

export default healthInsuranceApi;
