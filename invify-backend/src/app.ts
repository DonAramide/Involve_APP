// src/app.ts (network-stabilized)
import express, { Request, Response, NextFunction } from 'express';
import * as http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
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
import { AuditArchiveService } from './services/audit-archive.service';
import { GovAuditService } from './services/gov-audit.service';
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
import { SupportController } from './controllers/support.controller';
import { LookupController } from './controllers/lookup.controller';
import { CustomerController } from './controllers/customer.controller';
import { PosController } from './controllers/pos.controller';
import { TerminalController, terminalUploadMiddleware } from './controllers/terminal.controller';
import { SearchController } from './controllers/search.controller';
import { OrchestrationController } from './controllers/orchestration.controller';
import { AgentController } from './modules/agent-portal/agent.controller';
import { CloudMetricsController } from './controllers/cloud-metrics.controller';

import { authenticate } from './middleware/auth.middleware';
import { checkRole, checkTenantAccess } from './middleware/rbac.middleware';

const app = express();

const PORT = process.env.PORT || 3004;

// 1. GLOBAL MIDDLEWARE
app.use(helmet()); 
app.use(cors());   
app.use(morgan('dev')); 
app.use(express.json({
  limit: '50mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf; // Capture raw body for signature verification
  }
})); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


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
app.patch('/admin/tenants/:id/status', authenticate, checkRole(['super_admin']), AdminController.updateTenantStatus);
app.post('/admin/tenants/:id/emergency-lock', authenticate, checkRole(['super_admin']), AdminController.triggerEmergencyLock);

// Admin Agent Onboarding routes
app.post('/admin/agents/onboard', authenticate, checkRole(['super_admin', 'admin']), AgentController.onboardAgent);
app.get('/admin/agents', authenticate, checkRole(['super_admin', 'admin']), AgentController.listAgents);
app.get('/admin/agents/:id', authenticate, checkRole(['super_admin', 'admin']), AgentController.getAgentProfile);
app.patch('/admin/agents/:id/status', authenticate, checkRole(['super_admin', 'admin']), AgentController.updateAgentStatus);
app.patch('/admin/agents/:id/kyc', authenticate, checkRole(['super_admin', 'admin']), AgentController.updateAgentKyc);
app.get('/admin/agents/:id/commissions', authenticate, checkRole(['super_admin']), AgentController.getAgentCommissions);
app.patch('/admin/agents/:id/commissions', authenticate, checkRole(['super_admin']), AgentController.updateAgentCommissions);
app.post('/admin/agents/:id/message', authenticate, checkRole(['super_admin', 'admin']), AgentController.messageAgent);
app.post('/admin/agents/:id/message-tenants', authenticate, checkRole(['super_admin', 'admin']), AgentController.messageAgentTenants);

app.post('/admin/tenants/:id/reset-passwords', authenticate, checkRole(['super_admin']), AdminController.resetTenantPasswords);

// Agent Portal Routes
app.post('/api/agent/register', AgentController.register);
app.post('/api/agent/login', AgentController.login);
app.post('/api/agent/change-password', AgentController.changePassword);
app.post('/api/agent/resolve-suspension', AgentController.resolveSuspension);
app.get('/api/agent/dashboard', authenticate, AgentController.getDashboard);

import activationRoutes from './routes/activation.routes';
app.use(activationRoutes);

// Orchestration Endpoints
app.get('/api/orchestration/context', authenticate, checkRole(['super_admin']), OrchestrationController.getContext);
app.post('/api/orchestration/onboarding/provision', authenticate, checkRole(['super_admin']), OrchestrationController.provisionOnboarding);
app.post('/api/orchestration/modules/enable', authenticate, checkRole(['super_admin']), OrchestrationController.enableModule);
app.post('/api/orchestration/tiers/elevate', authenticate, checkRole(['super_admin']), OrchestrationController.elevateTier);
app.get('/admin/dashboard-stats', authenticate, checkRole(['super_admin']), AdminController.getDashboardStats);
app.get('/admin/audit-logs', authenticate, checkRole(['super_admin']), TerminalController.getAuditLog);
app.patch('/admin/profile', authenticate, AdminController.updateProfile);

// Cloud Metrics API Endpoints
const cloudMetricsController = new CloudMetricsController();
app.get('/cloud-metrics/overview', authenticate, cloudMetricsController.getOverview);
app.get('/cloud-metrics/sync-health', authenticate, cloudMetricsController.getSyncHealth);
app.get('/cloud-metrics/terminals', authenticate, cloudMetricsController.getTerminals);
app.get('/cloud-metrics/devices', authenticate, cloudMetricsController.getDevices);
app.get('/cloud-metrics/backups', authenticate, cloudMetricsController.getBackups);
app.get('/cloud-metrics/activity-feed', authenticate, cloudMetricsController.getActivityFeed);
app.get('/cloud-metrics/alerts', authenticate, cloudMetricsController.getAlerts);


// Global Settings (Super Admin Only)
app.get('/admin/settings', authenticate, checkRole(['super_admin']), AdminController.getGlobalSettings);
app.patch('/admin/settings', authenticate, checkRole(['super_admin']), AdminController.updateGlobalSettings);
app.get('/admin/settings/commissions', authenticate, checkRole(['super_admin']), AdminController.getGlobalCommissions);
app.patch('/admin/settings/commissions', authenticate, checkRole(['super_admin']), AdminController.updateGlobalCommissions);
app.post('/admin/broadcast', authenticate, checkRole(['super_admin']), AdminController.sendBroadcast);

// Subscriptions
app.post('/admin/subscriptions/extend', authenticate, checkRole(['super_admin']), AdminController.extendSubscription);
app.get('/api/subscription/status', AdminController.getSubscriptionStatus);

// API Endpoints for Admin (Invify Pro App / Operator App)
// User Device Controls & Audit Archiving (Super Admin only)
app.get('/api/admin/user-devices', authenticate, checkRole(['super_admin']), UserController.listDevices);
app.post('/api/admin/user-devices/approve', authenticate, checkRole(['super_admin']), UserController.approveDevice);
app.post('/api/admin/user-devices/block', authenticate, checkRole(['super_admin']), UserController.blockDevice);
app.post('/api/admin/audit/archive', authenticate, checkRole(['super_admin']), UserController.triggerArchiving);


// Device Activation Hub Endpoints
app.get('/devices', authenticate, DeviceController.getDevices);
app.get('/devices/activations', authenticate, DeviceController.getActivations);
app.post('/devices/activations', authenticate, DeviceController.createActivation);
app.post('/devices/validate', authenticate, DeviceController.validateCode);
app.post('/devices/onboard', DeviceController.onboardDevice);
app.patch('/devices/:id', authenticate, DeviceController.updateDevice);

// Terminal Sync (Public for mobile app)
app.post('/api/mobile/terminal/sync', TerminalController.mobileSync);

// Terminal Admin APIs
app.get('/api/admin/terminals', authenticate, checkRole(['super_admin', 'tenant_admin']), TerminalController.getTablets);
app.post('/api/admin/terminals/import', authenticate, checkRole(['super_admin']), terminalUploadMiddleware, TerminalController.importTerminals);
app.get('/api/admin/terminals/assignments', authenticate, checkRole(['super_admin', 'tenant_admin']), TerminalController.getAssignments);
app.post('/api/admin/terminals/assignments', authenticate, checkRole(['super_admin']), TerminalController.assignHardware);
app.get('/api/admin/terminals/audit', authenticate, checkRole(['super_admin']), TerminalController.getAuditLog);
app.patch('/api/admin/terminals/:id/status', authenticate, checkRole(['super_admin']), TerminalController.updateTablet);
app.get('/admin/analytics', authenticate, checkRole(['super_admin']), AnalyticsController.getAdminAnalytics);

// Global AI Search
app.get('/api/search', authenticate, SearchController.performGlobalSearch);

/** --- FINANCIAL REVIEWS (SUPER ADMIN + TENANT ADMIN) --- **/
app.get('/admin/tenants/:id/details', authenticate, checkTenantAccess, AdminController.getTenantDetails);
app.post('/admin/tenants/:id/provision-va', authenticate, checkTenantAccess, AdminController.provisionVirtualAccount);
app.post('/admin/tenants/:id/students/:studentId/provision-va', authenticate, checkTenantAccess, AdminController.provisionStudentVirtualAccount);
app.post('/admin/tenants/:id/customers/:customerId/provision-va', authenticate, checkTenantAccess, AdminController.provisionCustomerVirtualAccount);
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

app.get('/api/reconciliation', authenticate, checkRole(['super_admin', 'tenant_admin', 'finance_staff']), ReconciliationController.getReport);
app.post('/api/reconciliation/assign', authenticate, checkRole(['super_admin', 'tenant_admin', 'finance_staff']), ReconciliationController.assign);
app.post('/api/reconciliation/retry', authenticate, checkRole(['super_admin', 'tenant_admin', 'finance_staff']), ReconciliationController.retry);


// Payout Configuration
app.get('/api/payout/settings', authenticate, PayoutController.getSettings);
app.post('/api/payout/settings', authenticate, PayoutController.saveSettings);
app.post('/api/payout/withdraw', authenticate, PayoutController.withdraw);
app.get('/api/payout/history', authenticate, PayoutController.getHistory);

// Executive Dashboard
app.get('/api/finance/executive-summary', authenticate, checkRole(['super_admin', 'tenant_admin', 'finance_staff']), ExecutiveFinanceController.getSummary);

// POS Operations (Medusa | Cpoint-Kimono | NIBSS)
app.post('/api/pos/transaction', authenticate, PosController.processTransaction);
app.get('/api/pos/history', authenticate, PosController.getTransactionHistory);
app.post('/api/pos/test-iso', authenticate, PosController.testIso);  // ISO8583 debug parser
app.get('/admin/pos/routing', authenticate, checkRole(['super_admin']), PosController.getRoutingConfig);
app.post('/admin/pos/routing', authenticate, checkRole(['super_admin']), PosController.updateRoutingConfig);
app.post('/admin/pos/kimono-params/refresh', authenticate, checkRole(['super_admin']), PosController.refreshKimonoParams);

// Terminal & Inventory Management Operations
app.get('/api/admin/inventory/stats', authenticate, TerminalController.getStats);
app.get('/api/admin/inventory/tablets', authenticate, TerminalController.getTablets);
app.patch('/api/admin/inventory/tablets/:id', authenticate, TerminalController.updateTablet);
app.get('/api/admin/inventory/mpos', authenticate, TerminalController.getMpos);
app.patch('/api/admin/inventory/mpos/:id', authenticate, TerminalController.updateMpos);
app.get('/api/admin/inventory/printers', authenticate, TerminalController.getPrinters);
app.patch('/api/admin/inventory/printers/:id', authenticate, TerminalController.updatePrinter);
app.get('/api/admin/inventory/tids', authenticate, TerminalController.getTids);
app.patch('/api/admin/inventory/tids/:id', authenticate, TerminalController.updateTid);
app.post('/api/admin/inventory/upload', authenticate, terminalUploadMiddleware, TerminalController.importTerminals);
app.post('/api/admin/inventory/assign', authenticate, TerminalController.assignHardware);
app.get('/api/admin/inventory/assignments', authenticate, TerminalController.getAssignments);
app.get('/api/admin/inventory/audit', authenticate, TerminalController.getAuditLog);

// ─── APK Fleet Deployment ────────────────────────────────────────────────
import { ApkController, apkUploadMiddleware } from './controllers/apk.controller';
app.get('/api/admin/apk', authenticate, ApkController.getVault);
app.post('/api/admin/apk/upload', authenticate, apkUploadMiddleware, ApkController.uploadApk);
app.post('/api/admin/apk/deploy', authenticate, ApkController.deployApk);
app.post('/api/admin/apk/uninstall', authenticate, ApkController.uninstallApk);
app.delete('/api/admin/apk/:id', authenticate, ApkController.removeApk);
app.patch('/api/admin/apk/:id/url', authenticate, ApkController.updateApkUrl);

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
app.post('/api/finance/customer-virtual-account/:customerId', authenticate, CustomerController.getVirtualAccount);

// ─── GOVERNANCE AUDIT LEDGER ROUTES ────────────────────────────────────────

// GET /api/admin/audit/ledger  ─  Unified multi-source audit ledger
app.get('/api/admin/audit/ledger', authenticate, checkRole(['super_admin', 'internal_staff']), async (req: Request, res: Response) => {
  try {
    const result = await GovAuditService.getLedger(req.query as any);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/audit/log  ─  Write a governance/maker-checker audit entry
app.post('/api/admin/audit/log', authenticate, async (req: Request, res: Response) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const user = (req as any).user || {};
    await GovAuditService.logAction({
      id: `gov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      module: req.body.module || 'GOVERNANCE',
      action: req.body.action || 'UNKNOWN_ACTION',
      user_email: user.email || req.body.user_email || 'unknown',
      user_name: user.name || req.body.user_name || (user.email?.split('@')[0]?.toUpperCase() || 'Unknown'),
      ip_address: ip,
      location: req.body.location,
      target: req.body.target || '-',
      status: req.body.status || 'success',
      metadata: req.body.metadata || {}
    });
    res.json({ success: true, message: 'Audit entry logged.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SUPPORT & COMPLAINTS ROUTES ─────────────────────────────────────────────
app.post('/api/mobile/complaints', SupportController.createComplaint);
app.get('/api/mobile/complaints', SupportController.getMobileComplaints);
app.get('/api/admin/complaints', authenticate, checkRole(['super_admin', 'internal_staff', 'admin_ops']), SupportController.listComplaints);
app.patch('/api/admin/complaints/:id/status', authenticate, checkRole(['super_admin', 'internal_staff', 'admin_ops']), SupportController.updateComplaintStatus);

// ─── EMERGENCY APPLOCK ─────────────────────────────────────────────
app.post('/api/admin/emergency-lock', authenticate, checkRole(['super_admin', 'internal_staff']), (req: Request, res: Response) => {
  try {
    const { tenant_id, passcode } = req.body;
    if (!tenant_id || !passcode) {
      return res.status(400).json({ success: false, message: 'Missing tenant_id or passcode' });
    }
    
    // Save to local DB if in offline mode
    if (process.env.OFFLINE_MOCK_AUTH === 'true') {
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(process.cwd(), 'tenants_db.json');
      if (fs.existsSync(dbPath)) {
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        const index = data.findIndex((t: any) => t.id === tenant_id);
        if (index !== -1) {
          data[index].emergency_lock_code = passcode;
          data[index].is_emergency_locked = true;
          fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        }
      }
    } else {
      // Supabase flow (fire and forget for now)
      const { supabase } = require('./db/supabase');
      supabase.from('tenants').update({ emergency_lock_code: passcode, is_emergency_locked: true }).eq('id', tenant_id).then();
    }

    // The `io` instance is created at the bottom of app.ts, so we can access it lazily
    process.nextTick(() => {
      io.to(`tenant:${tenant_id}`).emit('emergency_lock', { action: 'lock', passcode });
    });
    
    return res.json({ success: true, message: 'Emergency lock signal broadcasted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

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
const server = http.createServer(app);

export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket: Socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  
  // Clients will emit 'join_room' passing their characteristics
  socket.on('join_room', (data: any) => {
    const joined = ['all'];
    if (data.tenantId) { socket.join(`tenant:${data.tenantId}`); joined.push(`tenant:${data.tenantId}`); }
    if (data.plan) { socket.join(`plan:${String(data.plan).toLowerCase()}`); joined.push(`plan:${data.plan}`); }
    if (data.type) { socket.join(`type:${String(data.type).toLowerCase()}`); joined.push(`type:${data.type}`); }
    if (data.deviceId) { socket.join(`device:${data.deviceId}`); joined.push(`device:${data.deviceId}`); }
    if (data.businessName) { socket.join(`business:${data.businessName}`); joined.push(`business:${data.businessName}`); }
    socket.join('all');
    console.log(`[Socket.io] Client ${socket.id} joined rooms: ${joined.join(', ')}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Run audit logs archival sweep periodically (once every 1 hour)
setInterval(() => {
  AuditArchiveService.runArchiving().catch((err: any) => {
    console.error('[AuditArchive] Scheduled sweep failed:', err.message);
  });
}, 60 * 60 * 1000);

// Run an initial sweep 10 seconds after boot to process any existing stale records
setTimeout(() => {
  AuditArchiveService.runArchiving().catch((err: any) => {
    console.error('[AuditArchive] Initial boot sweep failed:', err.message);
  });
}, 10000);

// Seed sample governance audit logs on first boot
setTimeout(() => {
  try { GovAuditService.seedSampleLogs(); } catch {}
}, 3000);

// Only bind to a port when NOT running inside Jest/Supertest
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Invify SaaS (TS) running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });
}

export default app;
