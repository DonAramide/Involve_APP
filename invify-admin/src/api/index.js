import axios from 'axios';
import { Notify } from 'quasar';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});

api.interceptors.request.use((config) => {
  // Setup authorization header later if needed
  const token = localStorage.getItem('invify_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('invify_token');
        localStorage.removeItem('invify_refresh_token');
        localStorage.removeItem('operator_role');
        localStorage.removeItem('operator_email');
        localStorage.removeItem('mfa_status_verified');
        localStorage.removeItem('impersonation_context');

        Notify.create({
          type: 'negative',
          message: 'Session Expired: You have been logged out. Please log in again.',
          position: 'top-right',
          timeout: 4500,
          icon: 'logout'
        });

        window.location.href = '/login';
      }
    } else if (error.response && error.response.status === 403) {
      Notify.create({
        type: 'warning',
        message: 'Access Restricted: This feature is out of your control or operates in Read-Only mode for your role.',
        position: 'top-right',
        timeout: 4000,
        icon: 'lock'
      });
      // Return empty data gracefully for GET requests so lists just appear empty instead of breaking the UI
      if (error.config.method === 'get') {
        return Promise.resolve({ data: [] });
      }
    }
    return Promise.reject(error);
  }
);

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
  getTenants: (params) => api.get('/admin/tenants', { params }),
  createTenant: (data) => api.post('/admin/tenants', data),
  updateTenant: (id, data) => api.patch(`/admin/tenants/${id}`, data),
  getTenantDetails: (id) => api.get(`/admin/tenants/${id}/details`),
  getTenantKyc: (id) => api.get(`/api/tenant/${id}/kyc`),
  provisionVirtualAccount: (id) => api.post(`/admin/tenants/${id}/provision-virtual-account`),
  
  // Financial Platform Tenant Operations
  getFinancialPlatformHealth: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/financial-platform/health`),
  getFinancialPlatformAudit: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/financial-platform/audit`),
  activateFinancialPlatform: (tenantId) => api.post(`/api/v1/tenants/${tenantId}/financial-platform/activate`),
  rotateFinancialPlatformCredentials: (tenantId) => api.post(`/api/v1/tenants/${tenantId}/financial-platform/rotate`),

  getLedger: (params) => api.get('/admin/ledger', { params }),
  getPayments: (params) => api.get('/admin/payments', { params }),
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  getAnalytics: () => api.get('/admin/analytics'),
  
  // Users Management
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  sendInvite: (data) => api.post('/admin/invites', data),
  updateProfile: (data) => api.patch('/admin/profile', data),
  getGlobalSettings: () => api.get('/admin/settings'),
  updateGlobalSettings: (data) => api.patch('/admin/settings', data),
  getUserDevices: (params) => api.get('/api/admin/user-devices', { params }),
  approveUserDevice: (id) => api.post('/api/admin/user-devices/approve', { id }),
  blockUserDevice: (id) => api.post('/api/admin/user-devices/block', { id }),
  triggerAuditArchiving: () => api.post('/api/admin/audit/archive'),
  emergencyLock: (data) => api.post('/api/admin/emergency-lock', data),

  // Commissions
  listAgents: (params) => api.get('/admin/agents', { params }),
  getGlobalCommissions: () => api.get('/admin/settings/commissions'),
  updateGlobalCommissions: (data) => api.patch('/admin/settings/commissions', data),
  getAgentCommissions: (id) => api.get(`/admin/agents/${id}/commissions`),
  updateAgentCommissions: (id, data) => api.patch(`/admin/agents/${id}/commissions`, data),

  // Support & Complaints
  getComplaints: () => api.get('/api/admin/complaints'),
  updateComplaintStatus: (id, status) => api.patch(`/api/admin/complaints/${id}/status`, { status }),

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
  getDevices: () => api.get('/devices'),
  getActivations: () => api.get('/devices/activations'),
  createActivation: (data) => api.post('/devices/activations', data),
  validateCode: (data) => api.post('/devices/validate', data),
  updateDevice: (id, data) => api.patch(`/devices/${id}`, data),

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
  getPayoutStats: () => api.get('/api/v1/finance/stats/payouts'),
  getInvoices: () => api.get('/api/v1/finance/invoices'),
  createInvoice: (data) => api.post('/api/v1/finance/invoices', data),
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
