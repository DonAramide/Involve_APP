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
// middleware
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));


// Routes
// 1. Webhooks
app.post('/api/webhooks/monnify', monnifyWebhook);

// 2. Student Management
app.post('/api/students', createStudent);
app.get('/api/students/:studentId/summary', getStudentFinancialSummary);
app.get('/api/students/:studentId/virtual-account', getStudentVirtualAccount);
app.get('/api/students/:studentId/transactions', getStudentTransactions);

// 3. Analytics & Finance Dashboard
app.get('/api/analytics', getDashboardAnalytics);
app.get('/api/finance/daily-revenue', getDailyRevenue);
app.get('/api/finance/transactions', getGlobalTransactions);

// 4. Manual Transactions
app.post('/api/finance/transactions/manual', recordManualPayment);
app.post('/api/finance/transactions/discount', applyDiscount);

// 5. Push Notifications
app.post('/api/push-tokens', registerPushToken);
app.post('/api/webhooks/quaser', quaserWebhook);




// 4. Testing Utils (Dev Only)
app.post('/api/test/mock-webhook', triggerMockWebhook);

// 6. Services Module (Offline-First Sync)
app.post('/api/services/sync/jobs', syncJobs);
app.post('/api/services/sync/payments', syncPayments);
app.post('/api/services/sync/customers', syncCustomers);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Senior Fintech Backend running on port ${PORT}`);
});

module.exports = app;
