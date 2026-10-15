// invify-admin/src/api/healthInsuranceApi.js
import { api } from './index';

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
    headers: { 'x-platform-reason': reason || sessionStorage.getItem('hw_platform_reason') || 'Routine platform health governance audit' }
  }),
  getPlatformTenants: (params, reason) => api.get('/api/v1/health-insurance/platform/tenants', {
    params,
    headers: { 'x-platform-reason': reason || sessionStorage.getItem('hw_platform_reason') || 'Tenant health participation review' }
  }),
  getProvidersHealth: (reason) => api.get('/api/v1/health-insurance/platform/providers/health', {
    headers: { 'x-platform-reason': reason || sessionStorage.getItem('hw_platform_reason') || 'HMO provider telemetry check' }
  }),
  getCoverageTrends: (reason) => api.get('/api/v1/health-insurance/platform/coverage-trends', {
    headers: { 'x-platform-reason': reason || sessionStorage.getItem('hw_platform_reason') || 'Platform coverage analytics query' }
  }),
  getPlatformGrants: (params, reason) => api.get('/api/v1/health-insurance/platform/grants', {
    params,
    headers: { 'x-platform-reason': reason || sessionStorage.getItem('hw_platform_reason') || 'Platform operator grant audit' }
  }),
  createPlatformGrant: (data, reason) => api.post('/api/v1/health-insurance/platform/grants', data, {
    headers: { 'x-platform-reason': reason || sessionStorage.getItem('hw_platform_reason') || 'Platform operator grant creation' }
  }),
  revokePlatformGrant: (grantId, data, reason) => api.post(`/api/v1/health-insurance/platform/grants/${grantId}/revoke`, data, {
    headers: { 'x-platform-reason': reason || sessionStorage.getItem('hw_platform_reason') || 'Platform operator grant revocation' }
  }),
  getPlatformAuditEvents: (params, reason) => api.get('/api/v1/health-insurance/platform/audit-events', {
    params,
    headers: { 'x-platform-reason': reason || sessionStorage.getItem('hw_platform_reason') || 'Platform health audit review' }
  }),
  getMyGrantStatus: () => api.get('/api/v1/health-insurance/platform/grant-status'),
  selfActivateGrant: (data) => api.post('/api/v1/health-insurance/platform/grants/self-activate', data)
};

export default healthInsuranceApi;
