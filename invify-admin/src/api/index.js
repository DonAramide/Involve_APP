import axios from 'axios';

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
  getReport: () => api.get('/reconciliation'),
  fixIssue: (data) => api.post('/reconciliation/fix', data)
};

export const posApi = {
  // Routing configuration (super_admin only)
  getRoutingConfig:    ()     => api.get('/admin/pos/routing'),
  updateRoutingConfig: (data) => api.post('/admin/pos/routing', data),

  // Transaction history
  getHistory: () => api.get('/api/pos/history'),

  // Kimono terminal key refresh (super_admin only)
  refreshKimonoParams: (terminalId) =>
    api.post('/admin/pos/kimono-params/refresh', { terminalId }),
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

export { api };
export default api;
