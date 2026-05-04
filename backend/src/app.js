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
const { monnifyWebhook, quaserWebhook } = require('./api/controllers/webhook.controller');
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
// middleware
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));


const { authenticate, authorize, requireMasterMode } = require('./api/middleware/auth.middleware');
const AdminController = require('./api/controllers/admin.controller');
const FinanceController = require('./api/controllers/finance.controller');
const CashController = require('./api/controllers/cash.controller');
const BillingController = require('./api/controllers/billing.controller');
const InsightsController = require('./api/controllers/insights.controller');

// Routes
// 0. Authentication (Public initially, but login is needed)
// app.post('/api/auth/login', AuthController.login);

// 1. Webhooks (Public with signature verification)
app.post('/api/webhooks/monnify', monnifyWebhook);
app.post('/api/webhooks/quaser', quaserWebhook);

// 2. Admin Module (Protected)
app.post('/api/admin/master-mode/enter', authenticate, AdminController.enterMasterMode);
app.get('/api/admin/api-keys', authenticate, authorize(['SUPER_ADMIN']), AdminController.getApiKeys);
app.get('/api/admin/users', AdminController.getUsers);
app.get('/api/admin/tenants', AdminController.getTenants);
app.post('/api/admin/tenants', AdminController.createTenant);
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
