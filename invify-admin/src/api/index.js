import axios from 'axios';
import { Notify } from 'quasar';
import { loginPathForContext } from '../utils/authLoginPaths';
import { resolveApiBaseUrl } from '../config/env';
import { attachSessionInterceptors, readAccessToken } from '../auth/session';

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 30000,
  headers: {}
});

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Resolve active tenant: JWT wins for tenant operators; localStorage for platform impersonation. */
function resolveClientTenantId() {
  const stored = localStorage.getItem('tenant_id');
  const role = String(localStorage.getItem('operator_role') || '').toUpperCase();
  const isPlatform = ['SUPER_ADMIN', 'ADMIN', 'AGENT', 'SUPPORT', 'PLATFORM_ADMIN'].includes(role);

  const token = localStorage.getItem('invify_token');
  const payload = token ? decodeJwtPayload(token) : null;
  const jwtTenant =
    payload?.tenantId ||
    payload?.user_metadata?.tenant_id ||
    payload?.user_metadata?.tenantId ||
    payload?.app_metadata?.tenant_id ||
    null;

  // Platform operators may browse/impersonate via localStorage tenant_id.
  if (isPlatform) {
    return stored && stored !== 'undefined' && stored !== 'null' && stored !== 'global'
      ? stored
      : jwtTenant;
  }

  // Tenant operators: never keep a stale twin tenant from an older session.
  if (jwtTenant) {
    if (stored !== jwtTenant) {
      localStorage.setItem('tenant_id', jwtTenant);
    }
    return jwtTenant;
  }

  return stored && stored !== 'undefined' && stored !== 'null' && stored !== 'global'
    ? stored
    : null;
}

/** Attach active tenant so platform-operator payout APIs do not 400. */
function withClientTenantId(payload) {
  const tenantId = resolveClientTenantId();
  if (!tenantId) return payload ? { ...payload } : {};
  return { ...(payload || {}), tenantId };
}

api.interceptors.request.use((config) => {
  const token = readAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Tenant portal / impersonation: always scope requests to the active tenant.
  // Without this, super_admin JWTs resolve to the system tenant and school roster looks empty.
  const tenantId = resolveClientTenantId();
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  return config;
});

attachSessionInterceptors(api, { Notify, loginPathForContext });

export const onboardingApi = {
  signup: (data) => api.post('/public/onboarding/signup', data), // PUBLIC (Supports referralCode)
  validateInvite: (token) => api.get(`/public/invites/validate/${token}`), // PUBLIC
  acceptInvite: (data) => api.post('/public/invites/accept', data), // PUBLIC
};

export const referralApi = {
  getStats: () => api.get('/referrals/stats'),
  sendInvite: (data) => api.post('/referrals/send', data),
};

export const adminApi = {
  // Tenant CRUD
  getTenants: (params) => api.get('/api/admin/tenants', { params }),
  createTenant: (data) => api.post('/api/admin/tenants', data),
  updateTenant: (id, data) => api.patch(`/api/admin/tenants/${id}`, data),
  getTenantDetails: (id) => api.get(`/api/admin/tenants/${id}/details`),
  getTenantKyc: (id) => api.get(`/api/tenant/${id}/kyc`),
  provisionVirtualAccount: (id) => api.post(`/api/admin/tenants/${id}/provision-virtual-account`),
  
  // Financial Platform Tenant Operations
  getFinancialPlatformHealth: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/financial-platform/health`),
  getFinancialPlatformAudit: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/financial-platform/audit`),
  activateFinancialPlatform: (tenantId) => api.post(`/api/v1/tenants/${tenantId}/financial-platform/activate`),
  rotateFinancialPlatformCredentials: (tenantId) => api.post(`/api/v1/tenants/${tenantId}/financial-platform/rotate`),
  changeFinancialPlatformVertical: (tenantId, data) =>
    api.post(`/api/v1/tenants/${tenantId}/financial-platform/change-vertical`, data),

  getLedger: (params) => api.get('/api/admin/ledger', { params }),
  // Legacy alias kept for older builds
  getLedgerLegacy: (params) => api.get('/admin/ledger', { params }),
  getAuditLedger: (params) => api.get('/api/admin/audit/ledger', { params }),
  getPayments: (params) => api.get('/admin/payments', { params }),
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  getAnalytics: () => api.get('/admin/analytics'),
  
  // Users Management
  getUsers: (params) => api.get('/api/admin/users', { params }),
  createUser: (data) => api.post('/api/admin/users', data),
  updateUser: (id, data) => api.patch(`/api/admin/users/${id}`, data),
  sendInvite: (data) => api.post('/admin/invites', data),
  getProfile: () => api.get('/api/admin/profile'),
  updateProfile: (data) => api.patch('/api/admin/profile', data),
  changePassword: (data) => api.post('/api/auth/change-password', data),
  getGlobalSettings: () => api.get('/api/admin/settings'),
  updateGlobalSettings: (data) => api.patch('/api/admin/settings', data),
  listQuasarIntegrations: () => api.get('/admin/quasar/integrations'),
  getQuasarHealth: () => api.get('/api/admin/quasar/health'),
  pingQuasar: () => api.get('/api/admin/quasar/health/live'),
  getQuasarPosEncryptionKeyStatus: (params) =>
    api.get('/admin/quasar/pos-encryption-key/status', { params }),
  rotateQuasarPosEncryptionKey: (data) =>
    api.post('/admin/quasar/pos-encryption-key/rotate', data),
  storeQuasarPosEncryptionKey: (data) =>
    api.post('/admin/quasar/pos-encryption-key/store', data),
  getQuasarApiKeyStatus: (params) =>
    api.get('/admin/quasar/api-key/status', { params }),
  issueQuasarLiveApiKey: (data) =>
    api.post('/admin/quasar/api-key/issue-live', data),
  getPlatformPayoutSettings: () => api.get('/api/payout/platform-settings'),
  getTenantPayoutSettings: () =>
    api.get('/api/payout/settings', { params: withClientTenantId() }),
  saveTenantPayoutSettings: (data) =>
    api.post('/api/payout/settings', withClientTenantId(data)),
  getPayoutBanks: (params) =>
    api.get('/api/payout/banks', { params: withClientTenantId(params) }),
  resolvePayoutAccount: (data) =>
    api.post('/api/payout/resolve-account', withClientTenantId(data)),
  initiatePayout: (data) =>
    api.post('/api/payout/withdraw', withClientTenantId(data)),
  getTenantStaff: () => api.get('/api/staff'),
  payStaffSalary: (id, data) => api.post(`/api/staff/${id}/pay-salary`, data),
  getUserDevices: (params) => api.get('/api/admin/user-devices', { params }),
  approveUserDevice: (id) => api.post('/api/admin/user-devices/approve', { id }),
  blockUserDevice: (id) => api.post('/api/admin/user-devices/block', { id }),
  triggerAuditArchiving: () => api.post('/api/admin/audit/archive'),
  emergencyLock: (data) => api.post('/api/admin/emergency-lock', data),
  resetTenantSystemPassword: (id, data) => api.post(`/api/admin/tenants/${id}/reset-passwords`, data || {}),

  // Virtual Accounts Management
  getVirtualAccounts: () => api.get('/api/finance/virtual-accounts'),
  getVirtualAccountTransactions: (accountNumber) => api.get(`/api/finance/virtual-accounts/${accountNumber}/transactions`),
  sweepVirtualAccount: (accountNumber, data) => api.post(`/api/finance/virtual-accounts/${accountNumber}/sweep`, data),
  getQuasarTransactions: (params) => api.get('/api/finance/quasar-transactions', { params }),

  // Commissions
  listAgents: (params) => api.get('/api/admin/agents', { params }),
  getGlobalCommissions: () => api.get('/api/admin/settings/commissions'),
  updateGlobalCommissions: (data) => api.patch('/api/admin/settings/commissions', data),
  getAgentCommissions: (id) => api.get(`/api/admin/agents/${id}/commissions`),
  updateAgentCommissions: (id, data) => api.patch(`/api/admin/agents/${id}/commissions`, data),

  // Support & Complaints
  getComplaints: () => api.get('/api/admin/complaints'),
  updateComplaintStatus: (id, status) => api.patch(`/api/admin/complaints/${id}/status`, { status }),

  // Live Broadcasts
  sendBroadcast: (data) => api.post('/api/admin/broadcast', data),

  // Maker-checker refunds / chargebacks / manual Quasar debit
  listFinancialDisputes: (params) => api.get('/api/admin/finance/disputes', { params }),
  createFinancialDispute: (data) => api.post('/api/admin/finance/disputes', data),
  getFinancialDispute: (id) => api.get(`/api/admin/finance/disputes/${id}`),
  getFinancialDisputeAudit: (id) => api.get(`/api/admin/finance/disputes/${id}/audit`),
  approveFinancialDispute: (id, data) => api.post(`/api/admin/finance/disputes/${id}/approve`, data || {}),
  rejectFinancialDispute: (id, data) => api.post(`/api/admin/finance/disputes/${id}/reject`, data || {}),

  // Retention & Insights
  getRetentionSuggestion: () => api.get('/admin/retention/suggestion'),
  getAtRisk: () => api.get('/admin/retention/at-risk'),

  // Curriculum System
  getCurriculum: (params) => api.get('/admin/curriculum', { params }),
  createTopic: (data) => api.post('/admin/curriculum', data),
  updateTopic: (id, data) => api.patch(`/admin/curriculum/${id}`, data),
  deleteTopic: (id) => api.delete(`/admin/curriculum/${id}`),

  // Collaborative Repository
  listNotes: (params) => api.get('/admin/notes', { params }),
  saveNote: (data) => api.post('/admin/notes', data),
  exportNotePdf: (id) => api.get(`/admin/notes/${id}/export`, { responseType: 'blob' }),
};

export const aiApi = {
  generateLessonNote: (data) => api.post('/ai/lesson-note/generate', data, { timeout: 120000 }),
  refreshLessonNote: (data) => api.post('/ai/lesson-note/refresh', data, { timeout: 120000 }),
  getTopics: (params) => api.get('/curriculum/topics', { params }),
  getSubjects: () => api.get('/curriculum/subjects'),
};

export const deviceApi = {
  getDevices: () => api.get('/api/devices'),
  getConnectedPresence: () => api.get('/api/devices/connected'),
  getActivations: () => api.get('/devices/activations'),
  createActivation: (data) => api.post('/devices/activations', data),
  validateCode: (data) => api.post('/devices/validate', data),
  updateDevice: (id, data) => api.patch(`/devices/${id}`, data),
  resetActivation: (code, data) => api.patch(`/devices/activations/${code}/reset`, data),

  // Telemetry & Fleet Visibility
  getDeviceStatus: (deviceId) => api.get(`/api/devices/${deviceId}/status`),
  getDeviceTelemetry: (deviceId) => api.get(`/api/devices/${deviceId}/telemetry`),
  getDeviceAlerts: (deviceId) => api.get(`/api/devices/${deviceId}/alerts`),
};

export const billingApi = {
  getStatus: () => api.get('/billing/status'),
  subscribe: (data) => api.post('/billing/subscribe', data),
};

export const financeApi = {
  getExecutiveSummary: () => api.get('/api/v1/finance/executive-summary'),
  getWalletBalance: () => api.get('/api/v1/wallet'),
  getWalletTransactions: () => api.get('/api/v1/wallet/transactions'),
  getPayoutStats: (headers) => api.get('/api/v1/finance/stats/payouts', { headers }),
  getInvoices: () => api.get('/api/v1/finance/invoices'),
  getInvoice: (id) => api.get(`/api/v1/finance/invoices/${id}`),
  createInvoice: (data) => api.post('/api/v1/finance/invoices', data),
};

export const servicesApi = {
  getSummary: (params) => api.get('/api/v1/services/summary', { params }),
};

export const crmApi = {
  getCustomers: (params) => api.get('/api/v1/crm/customers', { params }),
  getCustomer: (id) => api.get(`/api/v1/crm/customers/${id}`),
  createCustomer: (data) => api.post('/api/v1/crm/customers', data),
  updateCustomer: (id, data) => api.put(`/api/v1/crm/customers/${id}`, data),
};

export const inventoryApi = {
  searchProducts: (params) => api.get('/api/inventory/products', { params }),
  getProduct: (id) => api.get(`/api/inventory/products/${id}`),
  createProduct: (data) => api.post('/api/inventory/products', data),
  updateProduct: (id, data) => api.put(`/api/inventory/products/${id}`, data),
  archiveProduct: (id) => api.delete(`/api/inventory/products/${id}`),
  getLowStock: () => api.get('/api/inventory/stock/low'),
  getOutOfStock: () => api.get('/api/inventory/stock/out'),
  getStockSummary: () => api.get('/api/inventory/stock/summary'),
  getStockHistory: (id) => api.get(`/api/inventory/stock/${id}/history`),
  getCategories: () => api.get('/api/inventory/categories'),
  getSuppliers: () => api.get('/api/inventory/suppliers'),
};

export const attendanceApi = {
  listStudents: (params) => api.get('/attendance/students', { params }),
  enroll: (data) => api.post('/attendance/enroll', data),
  autoSave: (data) => api.post('/attendance/save', data),
  bulkPresent: (data) => api.post('/attendance/bulk-present', data),
  getHistory: () => api.get('/attendance/history'),
};

/** School-mode roster synced from Flutter Web Sync */
export const schoolApi = {
  getRoster: (config) => api.get('/api/school/roster', config),
  getAcademics: () => api.get('/api/school/roster', { params: { type: 'result' } }),
  bulkSync: (data) => api.post('/api/school/bulk-sync', data),
  getPayments: (config) => api.get('/api/school/payments', config),
  syncPayments: (data) => api.post('/api/school/payments/sync', data),
  getPaymentDisputes: (config) => api.get('/api/school/payment-disputes', config),
  raisePaymentDispute: (data) => api.post('/api/school/payment-disputes', data),
  updatePaymentDispute: (id, data) => api.patch(`/api/school/payment-disputes/${id}`, data),
};

export const insightsApi = {
  getClass: (params) => api.get('/insights/class', { params })
};

export const reconciliationApi = {
  getReport: (params) => api.get('/api/reconciliation', { params }),
  
  // Detail Tabs
  getDetails: (id) => api.get(`/api/reconciliation/${id}/details`),
  getLedger: (id) => api.get(`/api/reconciliation/${id}/ledger`),
  getSettlement: (id) => api.get(`/api/reconciliation/${id}/settlement`),
  getWallet: (id) => api.get(`/api/reconciliation/${id}/wallet`),
  getCard: (id) => api.get(`/api/reconciliation/${id}/card`),
  getBank: (id) => api.get(`/api/reconciliation/${id}/bank`),
  getAudit: (id) => api.get(`/api/reconciliation/${id}/audit`),
  getTimeline: (id) => api.get(`/api/reconciliation/${id}/timeline`),

  // Commands
  assign: (id, data) => api.post(`/api/reconciliation/${id}/assign`, data),
  escalate: (id, data) => api.post(`/api/reconciliation/${id}/escalate`, data),
  resolve: (id, data) => api.post(`/api/reconciliation/${id}/resolve`, data),
  forceMatch: (id, data) => api.post(`/api/reconciliation/${id}/force_match`, data),
  retry: (id, data) => api.post(`/api/reconciliation/${id}/retry`, data),
  lock: (id, data) => api.post(`/api/reconciliation/${id}/lock`, data),
  unlock: (id, data) => api.post(`/api/reconciliation/${id}/unlock`, data),
};

export const posApi = {
  // Routing configuration (super_admin only)
  getRoutingConfig:    ()     => api.get('/admin/pos/routing'),
  updateRoutingConfig: (data) => api.post('/admin/pos/routing', data),
  getAffectedDevices: (params) => api.get('/admin/pos/routing/affected-devices', { params }),

  // Transaction history
  getHistory: () => api.get('/api/pos/history'),

  // Kimono terminal key refresh (super_admin only)
  refreshKimonoParams: (terminalId) =>
    api.post('/admin/pos/kimono-params/refresh', { terminalId }),

  // Observability & Simulation
  getObservabilityMetrics: () => api.get('/admin/pos/observability'),
  simulateRoute: (data) => api.post('/admin/pos/simulate', data),
};

export const cardSettlementApi = {
  listTemplates: () => api.get('/api/admin/finance/card-settlement/templates'),
  listBatches: (params) => api.get('/api/admin/finance/card-settlement/batches', { params }),
  getBatch: (id) => api.get(`/api/admin/finance/card-settlement/batches/${id}`),
  upload: (formData) =>
    api.post('/api/admin/finance/card-settlement/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const searchApi = {
  globalSearch: (q) => api.get(`/api/search?q=${encodeURIComponent(q)}`)
};

export const commissionApi = {
  getApprovals: () => api.get('/admin/commissions/approvals'),
  approveCommission: (id) => api.post(`/admin/commissions/approvals/${id}/approve`),
  rejectCommission: (id, data) => api.post(`/admin/commissions/approvals/${id}/reject`, data),
  executeClawback: (data) => api.post('/admin/commissions/clawback', data),
  getAuditHistory: () => api.get('/admin/commissions/audit'),
  getAgentProgress: () => api.get('/admin/commissions/agents/progress'),
  getPlansAndTargets: () => api.get('/admin/commissions/plans'),
  getCampaignsAndBudgets: () => api.get('/admin/commissions/budgets'),
  simulate: (data) => api.post('/admin/commissions/simulate', data),

  // Plans & Targets CRUD Endpoints
  createProgram: (data) => api.post('/admin/commissions/programs', data),
  updateProgram: (id, data) => api.put(`/admin/commissions/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/admin/commissions/programs/${id}`),
  createVersion: (id, data) => api.post(`/admin/commissions/programs/${id}/versions`, data),
  cloneVersion: (id, data) => api.post(`/admin/commissions/versions/${id}/clone`, data),
  activateVersion: (id) => api.post(`/admin/commissions/versions/${id}/activate`),
  updateVersionRules: (id, data) => api.put(`/admin/commissions/versions/${id}/rules`, data),
  deleteVersion: (id) => api.delete(`/admin/commissions/versions/${id}`),

  createCategoryRule: (data) => api.post('/admin/commissions/category-rules', data),
  updateCategoryRule: (id, data) => api.put(`/admin/commissions/category-rules/${id}`, data),
  deleteCategoryRule: (id) => api.delete(`/admin/commissions/category-rules/${id}`),

  createPerformanceRule: (data) => api.post('/admin/commissions/performance-rules', data),
  updatePerformanceRule: (id, data) => api.put(`/admin/commissions/performance-rules/${id}`, data),
  deletePerformanceRule: (id) => api.delete(`/admin/commissions/performance-rules/${id}`),

  createTerminalRule: (data) => api.post('/admin/commissions/terminal-rules', data),
  updateTerminalRule: (id, data) => api.put(`/admin/commissions/terminal-rules/${id}`, data),
  deleteTerminalRule: (id) => api.delete(`/admin/commissions/terminal-rules/${id}`),
};

export const vaultApi = {
  listIntegrations: (scope, tenantId) => api.get('/vault/integrations', { params: { scope, tenantId } }),
  registerIntegration: (data) => api.post('/vault/integrations', data),
  addCredential: (vaultId, data) => api.post(`/vault/integrations/${vaultId}/credentials`, data),
  activateCredential: (vaultId, credentialId) => api.patch(`/vault/integrations/${vaultId}/credentials/${credentialId}/activate`),
  deleteCredential: (vaultId, credentialId) => api.delete(`/vault/integrations/${vaultId}/credentials/${credentialId}`),
  testConnection: (vaultId, data) => api.post(`/vault/integrations/${vaultId}/test`, data),
  saveQipConfig: (environment, data) => api.put('/vault/qip-config', { environment, ...data }),
  getQuasarWebhookSecretStatus: (environment = 'PRODUCTION') =>
    api.get('/api/admin/quasar/webhook-secret/status', { params: { environment } }),
  saveQuasarWebhookSigningSecret: (data) =>
    api.put('/api/admin/quasar/webhook-secret/global', data),
  getQuasarAdminCredentialsStatus: (environment = 'PRODUCTION') =>
    api.get('/api/admin/quasar/admin-credentials/status', { params: { environment } }),
  saveQuasarAdminCredentials: (data) =>
    api.put('/api/admin/quasar/admin-credentials', data),
  testQuasarAdminCredentials: (data = {}) =>
    api.post('/api/admin/quasar/admin-credentials/test', data),
  getMetaWhatsAppStatus: (environment = 'PRODUCTION') =>
    api.get('/vault/meta-whatsapp/status', { params: { environment } }),
  saveMetaWhatsAppCredentials: (data) =>
    api.put('/vault/meta-whatsapp', data),
};

export const ecsApi = {
  getProviders: () => api.get('/v1/ecs/providers'),
  getDefinitions: (namespace) => api.get(`/v1/ecs/${namespace}/definitions`),
  getConfiguration: (namespace, environment, tenantId) => api.get(`/v1/ecs/${namespace}`, { params: { environment, tenantId } }),
  saveConfiguration: (namespace, payload) => api.put(`/v1/ecs/${namespace}`, payload),
  testConnection: (namespace, environment) => api.post(`/v1/ecs/${namespace}/test?environment=${environment}`)
};

export const sandboxApi = {
  // Admin endpoints (admin JWT)
  createApiKey: (data) => api.post('/v1/admin/qfs/keys', data),
  listApiKeys: (params) => api.get('/v1/admin/qfs/keys', { params }),
  revokeApiKey: (id) => api.delete(`/v1/admin/qfs/keys/${id}`),
  getHealth: () => api.get('/v1/admin/financial-sandbox/health'),
  getAnalytics: () => api.get('/v1/admin/financial-sandbox/analytics'),
  listWebhooks: (params) => api.get('/v1/admin/financial-sandbox/webhooks', { params }),
  getWebhook: (id) => api.get(`/v1/admin/financial-sandbox/webhooks/${id}`),
  replayWebhook: (id) => api.post(`/v1/admin/financial-sandbox/webhooks/${id}/replay`),
  
  // Developer Portal endpoints - These will run using the provided API Key instead of admin JWT
  // But typically the admin frontend will use admin APIs unless we build a dedicated tenant portal.
};

export { api };
export default api;
