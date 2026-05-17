import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3004',
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

export default api;
