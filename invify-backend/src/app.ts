// src/app.ts (network-stabilized)
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// 1. IMPORTS (Controllers & Middleware)
import { PaymentController } from './controllers/payment.controller';
import { OnboardingController } from './controllers/onboarding.controller';
import { InviteController } from './controllers/invite.controller';
import { AIController } from './controllers/ai.controller';
import { AdminController } from './controllers/admin.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { WalletController } from './controllers/wallet.controller';
import { UserController } from './controllers/user.controller';
import { CurriculumController } from './controllers/curriculum.controller';
import { BillingController } from './controllers/billing.controller';
import { ReferralController } from './controllers/referral.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { InsightsController } from './controllers/insights.controller';
import { RetentionController } from './controllers/retention.controller';
import { WebhookController } from './controllers/webhook.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { StudentController } from './controllers/student.controller';
import { PayoutController } from './controllers/payout.controller';
import { ExecutiveFinanceController } from './controllers/finance.controller';
import { DefaultersController } from './controllers/defaulters.controller';
import { IntegrityController } from './controllers/integrity.controller';
import { NotificationController } from './controllers/notification.controller';
import { OTPController } from './controllers/otp.controller';
import { AuthController } from './controllers/auth.controller';
import { DeviceController } from './controllers/device.controller';
import { LookupController } from './controllers/lookup.controller';

import { authenticate } from './middleware/auth.middleware';
import { checkRole, checkTenantAccess } from './middleware/rbac.middleware';

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
app.post('/payments/initialize', PaymentController.initializeGatewayCheckout);

// Public Onboarding & System Lookup Data
app.get('/public/lookup', LookupController.getLookup);
app.post('/admin/lookup', LookupController.saveLookup);
app.post('/public/otp/send', OTPController.sendOTP);
app.post('/public/otp/verify', OTPController.verifyOTP);
app.post('/public/onboarding/signup', OnboardingController.signup);
app.post('/public/onboarding/provision', OnboardingController.provision);

// Platform User Authentication & MFA / Recovery
app.post('/api/auth/login', AuthController.login);
app.post('/api/auth/reset-password', AuthController.resetPassword);

// Teacher Invitations (Public)
app.get('/public/invites/validate/:token', InviteController.validateInvite);
app.post('/public/invites/accept', InviteController.acceptInvite);

// AI Generation Endpoints
app.post('/ai/lesson-note/generate', authenticate, AIController.generateLessonNote);
app.post('/ai/lesson-note/refresh', authenticate, AIController.refreshLessonNote);

// Admin Endpoints

/** --- SYSTEM ADMIN (SUPER ADMIN ONLY) --- **/
app.get('/admin/tenants', authenticate, checkRole(['super_admin']), AdminController.listTenants);
app.post('/admin/tenants', authenticate, checkRole(['super_admin']), AdminController.createTenant);
app.patch('/admin/tenants/:id', authenticate, checkRole(['super_admin']), AdminController.updateTenant);
app.get('/admin/dashboard-stats', authenticate, checkRole(['super_admin']), AdminController.getDashboardStats);
app.patch('/admin/profile', authenticate, AdminController.updateProfile);

// Device Activation Hub Endpoints
app.get('/devices', authenticate, DeviceController.getDevices);
app.get('/devices/activations', authenticate, DeviceController.getActivations);
app.post('/devices/activations', authenticate, DeviceController.createActivation);
app.post('/devices/validate', authenticate, DeviceController.validateCode);
app.patch('/devices/:id', authenticate, DeviceController.updateDevice);


// Usage + Growth Intelligence
app.get('/admin/analytics', authenticate, checkRole(['super_admin']), AnalyticsController.getAdminAnalytics);

/** --- FINANCIAL REVIEWS (SUPER ADMIN + TENANT ADMIN) --- **/
app.get('/admin/tenants/:id/details', authenticate, checkTenantAccess, AdminController.getTenantDetails);
app.get('/admin/ledger', authenticate, checkTenantAccess, AdminController.listLedger);
app.get('/admin/payments', authenticate, checkTenantAccess, AdminController.listPayments);

// Wallet Endpoints (Internal Ledger)
app.get('/wallet', authenticate, checkTenantAccess, WalletController.getBalance);
app.get('/wallet/transactions', authenticate, checkTenantAccess, WalletController.getTransactions);

// Users Management
app.get('/admin/users', authenticate, checkRole(['super_admin', 'tenant_admin']), UserController.listUsers);
app.post('/admin/users', authenticate, checkRole(['super_admin', 'tenant_admin']), UserController.createUser);
app.patch('/admin/users/:id', authenticate, checkRole(['super_admin', 'tenant_admin']), UserController.updateUser);
app.post('/admin/invites', authenticate, checkRole(['tenant_admin', 'owner']), InviteController.sendInvite);

// Curriculum System
app.get('/admin/curriculum', authenticate, CurriculumController.listCurriculum);
app.post('/admin/curriculum', authenticate, checkRole(['super_admin']), CurriculumController.createTopic);
app.patch('/admin/curriculum/:id', authenticate, checkRole(['super_admin']), CurriculumController.updateTopic);
app.delete('/admin/curriculum/:id', authenticate, checkRole(['super_admin']), CurriculumController.deleteTopic);

// Collaborative Notes Repository
app.get('/admin/notes', authenticate, AdminController.listNotes);
app.post('/admin/notes', authenticate, AdminController.saveNote);
app.get('/admin/notes/:id/export', authenticate, AdminController.exportNotePdf);

// Billing & Subscriptions
app.get('/billing/status', authenticate, BillingController.getStatus);
app.post('/billing/subscribe', authenticate, BillingController.subscribe);

// Referral System
app.get('/referrals/stats', authenticate, ReferralController.getStats);
app.post('/referrals/send', authenticate, ReferralController.sendInvite);

// Attendance System
app.get('/attendance/students', authenticate, AttendanceController.listStudents);
app.post('/attendance/enroll', authenticate, AttendanceController.enroll);
app.post('/attendance/save', authenticate, AttendanceController.autoSave);
app.post('/attendance/bulk-present', authenticate, AttendanceController.bulkPresent);
app.get('/attendance/history', authenticate, AttendanceController.getHistory);

// Class Insights
app.get('/insights/class', authenticate, InsightsController.getClassInsights);

// Retention & Churn Prevention
app.post('/admin/retention/process', authenticate, checkRole(['super_admin']), RetentionController.processRetention);
app.get('/admin/retention/at-risk', authenticate, checkRole(['super_admin']), RetentionController.getAtRiskUsers);
app.get('/admin/retention/suggestion', authenticate, RetentionController.getPersonalSuggestion);

// Webhooks (Secret Verification handled internally)
app.post('/webhooks/quasar', WebhookController.handleQuasarWebhook);
app.post('/webhooks/paystack', WebhookController.handlePaystackWebhook);
app.post('/webhooks/flutterwave', WebhookController.handleFlutterwaveWebhook);
app.post('/webhooks/stripe', WebhookController.handleStripeWebhook);

app.get('/api/reconciliation', authenticate, ReconciliationController.getReport);
app.post('/api/reconciliation/assign', authenticate, ReconciliationController.assign);
app.post('/api/reconciliation/retry', authenticate, ReconciliationController.retry);


// Payout Configuration
app.get('/api/payout/settings', authenticate, PayoutController.getSettings);
app.post('/api/payout/settings', authenticate, PayoutController.saveSettings);
app.post('/api/payout/withdraw', authenticate, PayoutController.withdraw);
app.get('/api/payout/history', authenticate, PayoutController.getHistory);

// Executive Dashboard
app.get('/api/finance/executive-summary', authenticate, ExecutiveFinanceController.getSummary);


// Defaulters System
app.get('/api/finance/defaulters', authenticate, DefaultersController.getDefaulters);
app.post('/api/finance/defaulters/remind', authenticate, DefaultersController.sendReminder);


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
