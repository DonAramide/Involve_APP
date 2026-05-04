// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// 1. GLOBAL MIDDLEWARE
app.use(helmet()); 
app.use(cors());   
app.use(morgan('dev')); 
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf; // Capture raw body for signature verification
  }
})); 
app.use(express.urlencoded({ extended: true }));


// 2. ROUTES
import { PaymentController } from './controllers/payment.controller';

// Basic health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Payment Endpoints
app.post('/payments/create', PaymentController.createPayment);

// Public Onboarding
import { OnboardingController } from './controllers/onboarding.controller';
app.post('/public/onboarding/signup', OnboardingController.signup);

// Teacher Invitations (Public)
import { InviteController } from './controllers/invite.controller';
app.get('/public/invites/validate/:token', InviteController.validateInvite);
app.post('/public/invites/accept', InviteController.acceptInvite);

// AI Generation Endpoints
import { AIController } from './controllers/ai.controller';
app.post('/ai/lesson-note/generate', authenticate, AIController.generateLessonNote);
app.post('/ai/lesson-note/refresh', authenticate, AIController.refreshLessonNote);

// Admin Endpoints
import { AdminController } from './controllers/admin.controller';
import { authenticate } from './middleware/auth.middleware';
import { checkRole, checkTenantAccess } from './middleware/rbac.middleware';

/** --- SYSTEM ADMIN (SUPER ADMIN ONLY) --- **/
app.get('/admin/tenants', authenticate, checkRole(['super_admin']), AdminController.listTenants);
app.post('/admin/tenants', authenticate, checkRole(['super_admin']), AdminController.createTenant);
app.patch('/admin/tenants/:id', authenticate, checkRole(['super_admin']), AdminController.updateTenant);
app.get('/admin/dashboard-stats', authenticate, checkRole(['super_admin']), AdminController.getDashboardStats);
app.patch('/admin/profile', authenticate, AdminController.updateProfile);


// Usage + Growth Intelligence
import { AnalyticsController } from './controllers/analytics.controller';
app.get('/admin/analytics', authenticate, checkRole(['super_admin']), AnalyticsController.getAdminAnalytics);

/** --- FINANCIAL REVIEWS (SUPER ADMIN + TENANT ADMIN) --- **/
app.get('/admin/tenants/:id/details', authenticate, checkTenantAccess, AdminController.getTenantDetails);
app.get('/admin/ledger', authenticate, checkTenantAccess, AdminController.listLedger);
app.get('/admin/payments', authenticate, checkTenantAccess, AdminController.listPayments);

// Wallet Endpoints (Internal Ledger)
import { WalletController } from './controllers/wallet.controller';
app.get('/wallet', authenticate, checkTenantAccess, WalletController.getBalance);
app.get('/wallet/transactions', authenticate, checkTenantAccess, WalletController.getTransactions);

// Users Management
import { UserController } from './controllers/user.controller';
app.get('/admin/users', authenticate, checkRole(['super_admin', 'tenant_admin']), UserController.listUsers);
app.post('/admin/users', authenticate, checkRole(['super_admin', 'tenant_admin']), UserController.createUser);
app.patch('/admin/users/:id', authenticate, checkRole(['super_admin', 'tenant_admin']), UserController.updateUser);
app.post('/admin/invites', authenticate, checkRole(['tenant_admin', 'owner']), InviteController.sendInvite);

// Curriculum System
import { CurriculumController } from './controllers/curriculum.controller';
app.get('/admin/curriculum', authenticate, CurriculumController.listCurriculum);
app.post('/admin/curriculum', authenticate, checkRole(['super_admin']), CurriculumController.createTopic);
app.patch('/admin/curriculum/:id', authenticate, checkRole(['super_admin']), CurriculumController.updateTopic);
app.delete('/admin/curriculum/:id', authenticate, checkRole(['super_admin']), CurriculumController.deleteTopic);

// Collaborative Notes Repository
app.get('/admin/notes', authenticate, AdminController.listNotes);
app.post('/admin/notes', authenticate, AdminController.saveNote);
app.get('/admin/notes/:id/export', authenticate, AdminController.exportNotePdf);

// Billing & Subscriptions
import { BillingController } from './controllers/billing.controller';
app.get('/billing/status', authenticate, BillingController.getStatus);
app.post('/billing/subscribe', authenticate, BillingController.subscribe);

// Referral System
import { ReferralController } from './controllers/referral.controller';
app.get('/referrals/stats', authenticate, ReferralController.getStats);
app.post('/referrals/send', authenticate, ReferralController.sendInvite);

// Attendance System
import { AttendanceController } from './controllers/attendance.controller';
app.get('/attendance/students', authenticate, AttendanceController.listStudents);
app.post('/attendance/enroll', authenticate, AttendanceController.enroll);
app.post('/attendance/save', authenticate, AttendanceController.autoSave);
app.post('/attendance/bulk-present', authenticate, AttendanceController.bulkPresent);
app.get('/attendance/history', authenticate, AttendanceController.getHistory);

// Class Insights
import { InsightsController } from './controllers/insights.controller';
app.get('/insights/class', authenticate, InsightsController.getClassInsights);

// Retention & Churn Prevention
import { RetentionController } from './controllers/retention.controller';
app.post('/admin/retention/process', authenticate, checkRole(['super_admin']), RetentionController.processRetention);
app.get('/admin/retention/at-risk', authenticate, checkRole(['super_admin']), RetentionController.getAtRiskUsers);
app.get('/admin/retention/suggestion', authenticate, RetentionController.getPersonalSuggestion);

// Webhooks (Secret Verification handled internally)
import { WebhookController } from './controllers/webhook.controller';
app.post('/webhooks/quasar', WebhookController.handleQuasarWebhook);

import { ReconciliationController } from './controllers/reconciliation.controller';
import { StudentController } from './controllers/student.controller';
import { PayoutController } from './controllers/payout.controller';
app.get('/api/reconciliation', authenticate, ReconciliationController.getReport);
app.post('/api/reconciliation/assign', authenticate, ReconciliationController.assign);
app.post('/api/reconciliation/retry', authenticate, ReconciliationController.retry);

import { ExecutiveFinanceController } from './controllers/finance.controller';

// Payout Configuration
app.get('/api/payout/settings', authenticate, PayoutController.getSettings);
app.post('/api/payout/settings', authenticate, PayoutController.saveSettings);
app.post('/api/payout/withdraw', authenticate, PayoutController.withdraw);
app.get('/api/payout/history', authenticate, PayoutController.getHistory);

// Executive Dashboard
import { DefaultersController } from './controllers/defaulters.controller';
app.get('/api/finance/executive-summary', authenticate, ExecutiveFinanceController.getSummary);

import { IntegrityController } from './controllers/integrity.controller';

// Defaulters System
app.get('/api/finance/defaulters', authenticate, DefaultersController.getDefaulters);
app.post('/api/finance/defaulters/remind', authenticate, DefaultersController.sendReminder);

import { NotificationController } from './controllers/notification.controller';

// Financial Integrity
app.get('/api/finance/integrity/student-balances', authenticate, IntegrityController.validateStudentBalances);
app.post('/api/finance/integrity/recompute', authenticate, IntegrityController.recomputeBalances);

// Notifications Center
app.get('/api/notifications', authenticate, NotificationController.getNotifications);
app.post('/api/notifications/:id/read', authenticate, NotificationController.markAsRead);
app.post('/api/notifications/read-all', authenticate, NotificationController.markAllAsRead);

// Student & Finance Core
app.get('/api/finance/virtual-account/:studentId', authenticate, StudentController.getVirtualAccount);

// 3. 404 HANDLER
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 4. GLOBAL ERROR HANDLER
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// 5. START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Invify SaaS (TS) running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

export default app;
