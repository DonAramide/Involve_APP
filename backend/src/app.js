require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
}));
const { monnifyWebhook, quasarWebhook } = require('./api/controllers/webhook.controller');
const { 
    createStudent, 
    getDashboardAnalytics, 
    getDailyRevenue, 
    getGlobalTransactions,
    getStudentFinancialSummary,
    getStudentVirtualAccount,
    getStudentTransactions
} = require('./api/controllers/student.controller');
const { recordManualPayment, applyDiscount } = require('./api/controllers/finance.controller');
const { registerPushToken } = require('./api/controllers/push_token.controller');
const { triggerMockWebhook } = require('./api/controllers/test.controller');
const { syncJobs, syncPayments, syncCustomers } = require('./api/controllers/services.controller');
const AIController = require('./api/controllers/ai.controller');
const CurriculumController = require('./api/controllers/curriculum.controller');
const DeviceController = require('./api/controllers/device.controller');
// middleware
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));


const { authenticate, authorize, requireMasterMode } = require('./api/middleware/auth.middleware');
const AuthController = require('./api/controllers/auth.controller');
const GovernanceController = require('./api/controllers/governance.controller');
const AdminController = require('./api/controllers/admin.controller');
const FinanceController = require('./api/controllers/finance.controller');
const CashController = require('./api/controllers/cash.controller');
const BillingController = require('./api/controllers/billing.controller');
const InsightsController = require('./api/controllers/insights.controller');

// Routes
// 0. Authentication Hub
app.post('/api/auth/login', AuthController.login);
app.post('/api/auth/mfa/verify', AuthController.verifyMfa);
app.post('/api/auth/mfa/setup', AuthController.setupMfa);
app.post('/api/auth/refresh', AuthController.refreshToken);
app.post('/api/auth/impersonate', authenticate, AuthController.impersonateTenant);
app.post('/api/auth/logout', authenticate, AuthController.logout);
app.post('/api/auth/forgot-password', AuthController.forgotPassword);
app.post('/api/auth/reset-password', AuthController.resetPassword);

// 0.1 Operator & Session Governance Hub
app.post('/api/governance/operators', authenticate, authorize(['SUPER_ADMIN', 'INTERNAL_STAFF']), GovernanceController.createOperator);
app.post('/api/governance/operators/:operatorId/suspend', authenticate, authorize(['SUPER_ADMIN']), requireMasterMode, GovernanceController.suspendOperator);
app.get('/api/governance/sessions', authenticate, authorize(['SUPER_ADMIN', 'INTERNAL_STAFF']), GovernanceController.listActiveSessions);
app.post('/api/governance/sessions/revoke', authenticate, authorize(['SUPER_ADMIN', 'INTERNAL_STAFF']), GovernanceController.revokeSessionToken);
app.post('/api/governance/emergency/kill-switch', authenticate, authorize(['SUPER_ADMIN']), requireMasterMode, GovernanceController.triggerGlobalKillSwitch);
app.post('/api/governance/api-keys', authenticate, authorize(['SUPER_ADMIN']), requireMasterMode, GovernanceController.generateApiKey);
app.get('/api/governance/audit-lineage', authenticate, authorize(['SUPER_ADMIN', 'INTERNAL_STAFF']), GovernanceController.getAuditLineageLogs);

// 1. Webhooks (Public with signature verification)
app.post('/api/webhooks/monnify', monnifyWebhook);
app.post('/api/webhooks/quasar', quasarWebhook);

// 2. Admin Module (Protected)
app.post('/api/admin/master-mode/enter', authenticate, AdminController.enterMasterMode);
app.get('/api/admin/api-keys', authenticate, authorize(['SUPER_ADMIN']), AdminController.getApiKeys);
app.get('/api/admin/users', AdminController.getUsers);
app.get('/api/admin/tenants', AdminController.getTenants);
app.get('/api/admin/tenants/:id/details', AdminController.getTenantDetails);
app.post('/api/admin/tenants', AdminController.createTenant);
app.post('/api/admin/register-device', AdminController.registerDevice);
app.get('/api/admin/ledger', AdminController.getLedger);
app.get('/api/admin/dashboard-stats', AdminController.getDashboardStats);
app.post('/api/admin/api-keys', authenticate, authorize(['SUPER_ADMIN']), requireMasterMode, AdminController.createApiKey);
app.post('/api/admin/api-keys/:id/revoke', authenticate, authorize(['SUPER_ADMIN']), requireMasterMode, AdminController.revokeApiKey);
app.get('/api/admin/audit-logs', authenticate, authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN']), AdminController.getAuditLogs);

// 2.1 Insights & Billing Modules
app.get('/api/billing/status', BillingController.getStatus);
app.get('/api/insights/class', InsightsController.getClassInsights);

// 3. Finance Module (Standard Business Logic)
app.post('/api/finance/transactions/manual', authenticate, FinanceController.recordManualTransaction);
app.post('/api/finance/verify-payment', authenticate, FinanceController.verifyPayment);
app.get('/api/finance/student/:studentId/balance', authenticate, FinanceController.getStudentBalance);
app.get('/api/finance/ledger/history', authenticate, FinanceController.getLedgerHistory);

// 3.1 Cash Drawer Management
app.post('/api/finance/cash/open', authenticate, CashController.openSession);
app.post('/api/finance/cash/close/:id', authenticate, CashController.closeSession);

// 4. Student Management
app.post('/api/students', authenticate, createStudent);
app.get('/api/students/:studentId/summary', authenticate, getStudentFinancialSummary);
app.get('/api/students/:studentId/virtual-account', authenticate, getStudentVirtualAccount);
app.get('/api/students/:studentId/transactions', authenticate, getStudentTransactions);

// 5. Analytics & Dashboard
app.get('/api/analytics', authenticate, getDashboardAnalytics);
app.get('/api/finance/daily-revenue', authenticate, getDailyRevenue);
app.get('/api/finance/transactions', authenticate, getGlobalTransactions);

// 6. Push Notifications
app.post('/api/push-tokens', authenticate, registerPushToken);

// 7. Testing Utils (Dev Only)
app.post('/api/test/mock-webhook', triggerMockWebhook);

// 8. Services Module (Offline-First Sync)
app.post('/api/services/sync/jobs', authenticate, syncJobs);
app.post('/api/services/sync/payments', authenticate, syncPayments);
app.post('/api/services/sync/customers', authenticate, syncCustomers);

// 9. AI Module
app.post('/api/ai/lesson-note/generate', AIController.generateLessonNote);
app.get('/api/curriculum/topics', CurriculumController.getTopics);
app.get('/api/curriculum/subjects', CurriculumController.getSubjects);

// 10. Device Activation Module
app.get('/api/devices', DeviceController.getDevices);
app.get('/api/devices/activations', DeviceController.getActivationHistory);
app.post('/api/devices/activations', DeviceController.createActivationCode);
app.post('/api/devices/validate', DeviceController.validateCode);
app.patch('/api/devices/:id', DeviceController.updateDeviceStatus);

// 11. Multi-Tenant Orchestration & Experience Engine
const OrchestrationRouter = require('./api/routes/orchestration.routes');
app.use('/api/orchestration', OrchestrationRouter);

const { scheduleReconciliation } = require('./workers/reconciliation.worker');

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Senior Fintech Backend running on port ${PORT}`);
    
    // Start background sync
    try {
        await scheduleReconciliation();
    } catch (err) {
        console.error('Failed to start reconciliation scheduler:', err.message);
    }
});

module.exports = app;
