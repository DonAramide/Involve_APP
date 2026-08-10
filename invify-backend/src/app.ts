// src/app.ts (network-stabilized)
import express, { Request, Response, NextFunction } from 'express';
import * as http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Bypass Node 18+ strict TLS and IPv6 fetch failures for local Supabase connectivity
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

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
import { SchoolSyncController } from './controllers/school-sync.controller';
import { SchoolPaymentsController } from './controllers/school-payments.controller';
import { PayoutController } from './controllers/payout.controller';
import { ExecutiveFinanceController } from './controllers/finance.controller';
import { DefaultersController } from './controllers/defaulters.controller';
import { IntegrityController } from './controllers/integrity.controller';
import { NotificationController } from './controllers/notification.controller';
import { AuditController } from './controllers/audit.controller';
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
import { RuntimeController } from './controllers/runtime.controller';
import { AgentController } from './modules/agent-portal/agent.controller';
import { AdminAgentController } from './modules/agent-portal/controllers/admin-agent.controller';
import { CloudMetricsController } from './controllers/cloud-metrics.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { CommissionController } from './controllers/commission.controller';
import { QuasarHealthController } from './controllers/quasar-health.controller';
import { NightlyReconciliationJob } from './modules/financial-platform/reconciliation/NightlyReconciliationJob';
import { DatabaseStore } from './modules/financial-platform/infrastructure/DatabaseStore';
import { InvestigationQueueService } from './modules/financial-platform/reconciliation/InvestigationQueueService';
import { QuasarConnector } from './modules/financial-platform/infrastructure/QuasarConnector';

import { authenticate } from './middleware/auth.middleware';
import { checkRole, checkTenantAccess, checkTenantPermission } from './middleware/rbac.middleware';
import { correlationIdMiddleware } from './middleware/correlation.middleware';

const app = express();

app.use(correlationIdMiddleware);

const PORT = process.env.PORT || 3004;

// 1. GLOBAL MIDDLEWARE
app.disable('x-powered-by'); // Prevent framework fingerprinting
app.use(helmet()); 

// Dynamic CORS Configuration
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:5173']);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Request Payload Limits
const maxPayloadSize = process.env.MAX_REQUEST_SIZE || '2mb';
app.use(express.json({
  limit: maxPayloadSize,
  verify: (req: any, res, buf) => {
    req.rawBody = buf; // Capture raw body for signature verification
  }
})); 
app.use(express.urlencoded({ extended: true, limit: maxPayloadSize }));

// Rate Limiting Middlewares
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || '900000', 10), // Default: 15 mins
  max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '10000', 10),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10), // Default: 15 mins
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10000', 10),
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const verificationLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_VERIFICATION_WINDOW_MS || '3600000', 10), // Default: 1 hour
  max: parseInt(process.env.RATE_LIMIT_VERIFICATION_MAX || '10', 10),
  message: { error: 'Too many verification attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(morgan('dev')); 
app.use(globalLimiter);

import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


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
app.post('/payments/intents', PaymentController.createPayment);
app.get('/payments/intents/:id', PaymentController.getPaymentIntent);
app.post('/payments/intents/:id/cancel', PaymentController.cancelPaymentIntent);
app.post('/payments/intents/:id/refund', PaymentController.refundPaymentIntent);
app.get('/payments/history', PaymentController.getPaymentHistory);

// Public Onboarding & System Lookup Data
app.get('/public/lookup', LookupController.getLookup);
app.post('/admin/lookup', LookupController.saveLookup);
app.post('/public/otp/send', verificationLimiter, OTPController.sendOTP);
app.post('/public/otp/verify', verificationLimiter, OTPController.verifyOTP);
app.post('/public/onboarding/signup', verificationLimiter, OnboardingController.signup);
app.post('/public/onboarding/provision', verificationLimiter, OnboardingController.provision);
app.post('/public/onboarding/report-issue', OnboardingController.reportIssue);

// Platform User Authentication & MFA / Recovery
app.post('/api/auth/login', authLimiter, AuthController.login);
app.post('/api/auth/reset-password', authLimiter, AuthController.resetPassword);

// Teacher Invitations (Public)
app.get('/public/invites/validate/:token', InviteController.validateInvite);
app.post('/public/invites/accept', InviteController.acceptInvite);

// AI Generation Endpoints (Flutter uses /api/ai/*, admin may use /ai/*)
app.post('/api/ai/lesson-note/generate', authenticate, AIController.generateLessonNote);
app.post('/api/ai/lesson-note/refresh', authenticate, AIController.refreshLessonNote);
app.post('/ai/lesson-note/generate', authenticate, AIController.generateLessonNote);
app.post('/ai/lesson-note/refresh', authenticate, AIController.refreshLessonNote);

// Admin Endpoints

/** --- SYSTEM ADMIN (SUPER ADMIN ONLY) --- **/
app.get('/admin/tenants', authenticate, checkRole(['super_admin']), AdminController.listTenants);
app.post('/admin/tenants', authenticate, checkRole(['super_admin']), AdminController.createTenant);
app.patch('/admin/tenants/:id', authenticate, checkRole(['super_admin']), AdminController.updateTenant);
app.patch('/admin/tenants/:id/status', authenticate, checkRole(['super_admin']), AdminController.updateTenantStatus);
app.post('/admin/tenants/:id/emergency-lock', authenticate, checkRole(['super_admin']), AdminController.triggerEmergencyLock);
app.post('/admin/reconciliation/run-job', authenticate, checkRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const dbStore = new DatabaseStore();
    const quasarConnector = new QuasarConnector(null, null);
    const investigationQueueService = new InvestigationQueueService(dbStore, console);
    const job = new NightlyReconciliationJob(quasarConnector, dbStore, investigationQueueService, console);
    
    await job.run(targetDate);
    return res.status(200).json({ success: true, message: `Reconciliation job triggered for date: ${targetDate}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Insights & Reporting Routes
app.get('/api/admin/complaints', authenticate, checkRole(['super_admin', 'admin', 'support']), SupportController.listComplaints);
app.patch('/api/admin/complaints/:id/status', authenticate, checkRole(['super_admin', 'admin', 'support']), SupportController.updateComplaintStatus);
app.get('/admin/retention/suggestion', authenticate, checkRole(['super_admin', 'admin']), RetentionController.getPersonalSuggestion);
app.get('/admin/retention/at-risk', authenticate, checkRole(['super_admin', 'admin']), RetentionController.getAtRiskUsers);

// Dashboard Routes
app.get('/api/dashboard/overview', authenticate, checkRole(['super_admin', 'admin']), DashboardController.getOverview);
app.get('/api/dashboard/alerts', authenticate, checkRole(['super_admin', 'admin']), DashboardController.getAlerts);
app.get('/api/dashboard/governance', authenticate, checkRole(['super_admin', 'admin']), DashboardController.getGovernance);
app.get('/api/dashboard/analytics', authenticate, checkRole(['super_admin', 'admin']), DashboardController.getAnalytics);

// Admin Agent Onboarding routes
app.post('/admin/agents/onboard', authenticate, checkRole(['super_admin', 'admin']), AdminAgentController.onboardAgent);
app.get('/admin/agents', authenticate, checkRole(['super_admin', 'admin']), AdminAgentController.listAgents);
app.get('/admin/agents/:id', authenticate, checkRole(['super_admin', 'admin']), AdminAgentController.getAgent);
app.patch('/admin/agents/:id/status', authenticate, checkRole(['super_admin', 'admin']), AdminAgentController.updateAgentStatus);
// Commisssions and messaging can stay on AgentController if they were there, wait, let me just comment them out if they don't exist on AdminAgentController or keep them as is if they do exist on AgentController.
// Actually, earlier view_file showed AdminAgentController only has onboardAgent, listAgents, getAgent, updateAgentStatus, getAuditLogs.
// Wait, what about updateAgentKyc, getAgentCommissions, updateAgentCommissions, messageAgent, messageAgentTenants? Let me remove AgentController from them or check if they exist.
// Ah, let's keep the existing ones that weren't failing but fix listAgents and getAgentProfile.

app.patch('/admin/agents/:id/kyc', authenticate, checkRole(['super_admin', 'admin']), AdminAgentController.updateKycStatus);
app.get('/admin/agents/:id/commissions', authenticate, checkRole(['super_admin']), AdminAgentController.getCommissions);
app.patch('/admin/agents/:id/commissions', authenticate, checkRole(['super_admin']), AdminAgentController.updateCommissions);
app.post('/admin/agents/:id/message', authenticate, checkRole(['super_admin', 'admin']), AdminAgentController.messageAgent);
app.post('/admin/agents/:id/message-tenants', authenticate, checkRole(['super_admin', 'admin']), AdminAgentController.messageTenants);


app.post('/admin/tenants/:id/reset-passwords', authenticate, checkRole(['super_admin']), AdminController.resetTenantPasswords);

// Quasar Connectivity & Integration Health
app.get('/api/admin/quasar/health', authenticate, checkRole(['super_admin', 'admin']), QuasarHealthController.getHealthReport);
app.get('/api/admin/quasar/health/live', authenticate, checkRole(['super_admin', 'admin']), QuasarHealthController.getLiveness);
app.get('/api/admin/quasar/integrations', authenticate, checkRole(['super_admin', 'admin']), QuasarHealthController.listIntegrations);
app.put('/api/admin/quasar/integrations/:tenantId/webhook-secret', authenticate, checkRole(['super_admin', 'admin', 'owner']), QuasarHealthController.updateWebhookSigningSecret);
app.put('/api/admin/quasar/webhook-secret/global', authenticate, checkRole(['super_admin', 'admin', 'owner']), QuasarHealthController.updateGlobalWebhookSigningSecret);
app.get('/api/admin/quasar/webhook-secret/status', authenticate, checkRole(['super_admin', 'admin', 'owner']), QuasarHealthController.getWebhookSecretStatus);
app.put('/api/admin/quasar/admin-credentials', authenticate, checkRole(['super_admin']), QuasarHealthController.upsertAdminCredentials);
app.get('/api/admin/quasar/admin-credentials/status', authenticate, checkRole(['super_admin']), QuasarHealthController.getAdminCredentialsStatus);
app.post('/api/admin/quasar/admin-credentials/test', authenticate, checkRole(['super_admin']), QuasarHealthController.testAdminCredentials);

// ── QFS Financial Sandbox API (/api/v1/sandbox/*) ─────────────────────────────
import { qfsApiKeyAuth } from './middleware/qfs-api-key.middleware';
import { QfsSandboxController } from './controllers/qfs-sandbox.controller';
import { QfsAdminController } from './controllers/qfs-admin.controller';

const qfsRead  = qfsApiKeyAuth(['sandbox:read']);
const qfsWrite = qfsApiKeyAuth(['sandbox:write']);

// Session
app.get('/api/v1/sandbox',                          qfsRead,  QfsSandboxController.getSession);
// Bootstrap & Config
app.post('/api/v1/sandbox/bootstrap',               qfsWrite, QfsSandboxController.bootstrap);
app.get('/api/v1/sandbox/config',                   qfsRead,  QfsSandboxController.getConfig);
app.put('/api/v1/sandbox/config',                   qfsWrite, QfsSandboxController.updateConfig);
app.post('/api/v1/sandbox/config/generate-secret',  qfsWrite, QfsSandboxController.generateSecret);
// Banks
app.get('/api/v1/sandbox/banks',                    qfsRead,  QfsSandboxController.getBanks);
app.get('/api/v1/sandbox/bank-providers',           qfsRead,  QfsSandboxController.listBankProviders);
app.get('/api/v1/sandbox/bank/lookup',              qfsRead,  QfsSandboxController.lookupBank);
// Accounts (generate must come before :id routes)
app.post('/api/v1/sandbox/accounts/generate',       qfsWrite, QfsSandboxController.generateAccount);
app.get('/api/v1/sandbox/accounts',                 qfsRead,  QfsSandboxController.listAccounts);
app.get('/api/v1/sandbox/accounts/:id',             qfsRead,  QfsSandboxController.getAccount);
app.post('/api/v1/sandbox/accounts/:id/credit',     qfsWrite, QfsSandboxController.creditAccount);
app.post('/api/v1/sandbox/accounts/:id/debit',      qfsWrite, QfsSandboxController.debitAccount);
app.get('/api/v1/sandbox/accounts/:id/ledger',      qfsRead,  QfsSandboxController.getLedger);
app.get('/api/v1/sandbox/accounts/:id/balance-snapshots', qfsRead, QfsSandboxController.getBalanceSnapshots);
// Audit
app.get('/api/v1/sandbox/audit-logs',               qfsRead,  QfsSandboxController.getAuditLogs);
// Timeline
app.get('/api/v1/sandbox/timeline',                 qfsRead,  QfsSandboxController.getTimeline);
app.get('/api/v1/sandbox/timeline/:correlationId',  qfsRead,  QfsSandboxController.getTimelineByCorrelation);
// Profiles
app.get('/api/v1/sandbox/profiles',                 qfsRead,  QfsSandboxController.getProfiles);
// Transfers (generate must come before :id routes)
app.post('/api/v1/sandbox/transfers/generate',      qfsWrite, QfsSandboxController.generateTransfer);
app.post('/api/v1/sandbox/transfers',               qfsWrite, QfsSandboxController.createTransfer);
app.get('/api/v1/sandbox/transfers',                qfsRead,  QfsSandboxController.listTransfers);
app.get('/api/v1/sandbox/transfers/:id',            qfsRead,  QfsSandboxController.getTransfer);
app.post('/api/v1/sandbox/transfers/:id/approve',   qfsWrite, QfsSandboxController.approveTransfer);
app.post('/api/v1/sandbox/transfers/:id/reject',    qfsWrite, QfsSandboxController.rejectTransfer);
app.post('/api/v1/sandbox/transfers/:id/reverse',   qfsWrite, QfsSandboxController.reverseTransfer);
// PSP Simulators
app.get('/api/v1/sandbox/providers',                qfsRead,  QfsSandboxController.getProviders);
app.get('/api/v1/sandbox/providers/:provider',      qfsRead,  QfsSandboxController.getProvider);
app.post('/api/v1/sandbox/providers/:provider/simulate', qfsWrite, QfsSandboxController.simulateProvider);

// ── QFS Admin Routes (admin JWT auth) ─────────────────────────────────────────
// API Key management — provision sk_test_* keys for tenants
app.post('/api/v1/admin/qfs/keys',                  authenticate, checkRole(['super_admin']), QfsAdminController.createApiKey);
app.get('/api/v1/admin/qfs/keys',                   authenticate, checkRole(['super_admin']), QfsAdminController.listApiKeys);
app.delete('/api/v1/admin/qfs/keys/:id',            authenticate, checkRole(['super_admin']), QfsAdminController.revokeApiKey);
// Admin financial sandbox views
app.get('/api/v1/admin/financial-sandbox/webhooks', authenticate, checkRole(['super_admin', 'admin']), QfsAdminController.listWebhooks);
app.get('/api/v1/admin/financial-sandbox/webhooks/:id', authenticate, checkRole(['super_admin', 'admin']), QfsAdminController.getWebhook);
app.post('/api/v1/admin/financial-sandbox/webhooks/:id/replay', authenticate, checkRole(['super_admin']), QfsAdminController.replayWebhook);
app.get('/api/v1/admin/financial-sandbox/health',   authenticate, checkRole(['super_admin', 'admin']), QfsAdminController.getHealth);
app.get('/api/v1/admin/financial-sandbox/analytics', authenticate, checkRole(['super_admin', 'admin']), QfsAdminController.getAnalytics);

// Terminal Management Endpoints
import { TenantKycController } from './controllers/tenant-kyc.controller';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/tenant/kyc/upload', authenticate, upload.single('file'), TenantKycController.uploadKyc);
app.get('/api/tenant/:id/kyc', authenticate, checkRole(['super_admin', 'admin']), TenantKycController.getKycDocuments);

// Agent Portal Routes
app.post('/api/agent/register', AgentController.register);
app.post('/api/agent/login', AgentController.login);
app.post('/api/agent/change-password', AgentController.changePassword);
app.post('/api/agent/resolve-suspension', AgentController.resolveSuspension);
app.get('/api/agent/dashboard', authenticate, AgentController.getDashboard);

import activationRoutes from './routes/activation.routes';
import { authRoutes } from './routes/auth.routes';
import ecsRoutes from './routes/ecs.routes';
import vaultRoutes from './routes/vault.routes';
import settingsRoutes from './routes/settings.routes';
import financeRoutes from './routes/finance.routes';
import syncRoutes from './routes/sync.routes';
import crmRoutes from './routes/crm.routes';
import inventoryRoutes from './routes/inventory.routes';
import operationsRoutes from './routes/operations.routes';
import financialPlatformRoutes from './routes/financial-platform.routes';

app.use(activationRoutes);
app.use('/auth', authRoutes);
app.use('/v1/ecs', ecsRoutes);
app.use('/vault', vaultRoutes);
app.use('/settings', settingsRoutes);
app.use('/api/v1/finance', authenticate, financeRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/crm', authenticate, crmRoutes);
app.use('/api/inventory', authenticate, inventoryRoutes);
app.use('/api/v1', authenticate, operationsRoutes);
app.use('/api/v1', financialPlatformRoutes);


// Orchestration Endpoints
app.get('/api/orchestration/context', authenticate, checkRole(['super_admin']), OrchestrationController.getContext);
app.post('/api/orchestration/onboarding/provision', authenticate, checkRole(['super_admin']), OrchestrationController.provisionOnboarding);
app.post('/api/orchestration/modules/enable', authenticate, checkRole(['super_admin']), OrchestrationController.enableModule);
app.post('/api/orchestration/tiers/elevate', authenticate, checkRole(['super_admin']), OrchestrationController.elevateTier);

// Runtime Engine
app.get('/api/v1/runtime/config', authenticate, RuntimeController.getConfig);

// Admin Operations
app.post('/api/admin/master-mode/enter', authenticate, checkRole(['super_admin', 'admin', 'owner']), AdminController.enterMasterMode);
app.get('/api/admin/dashboard-stats', authenticate, checkRole(['super_admin', 'admin', 'owner']), AdminController.getDashboardStats);
app.get('/api/admin/audit-logs', authenticate, checkRole(['super_admin', 'admin', 'owner']), TerminalController.getAuditLog);
app.get('/admin/profile', authenticate, AdminController.getProfile);
app.patch('/admin/profile', authenticate, AdminController.updateProfile);
app.get('/api/admin/profile', authenticate, AdminController.getProfile);
app.patch('/api/admin/profile', authenticate, AdminController.updateProfile);

import fs from 'fs';

// Setup storage for local files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let destPath = 'uploads/other';
    if (file.fieldname === 'cac_document') {
      destPath = 'uploads/cac';
    } else if (file.fieldname === 'backup_file') {
      destPath = 'uploads/backups';
    }
    // Ensure dir exists
    const fullPath = path.join(__dirname, '..', destPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});

const localUpload = multer({ storage: storage });

app.post('/api/admin/upload-cac', authenticate, checkRole(['super_admin', 'admin', 'owner']), localUpload.single('cac_document'), AdminController.uploadCacDocument);
app.post('/api/admin/claude-backup', authenticate, checkRole(['super_admin', 'admin', 'owner']), localUpload.single('backup_file'), AdminController.uploadClaudeBackup);
app.post('/api/admin/virtual-account/init', authenticate, checkRole(['super_admin', 'admin', 'owner']), AdminController.initVirtualAccountEngine);

import { MfaController } from './controllers/mfa.controller';
app.post('/api/mfa/generate', authenticate, MfaController.generate);
app.post('/api/mfa/enable', authenticate, MfaController.enable);

// Cloud Metrics API Endpoints
const cloudMetricsController = new CloudMetricsController();
app.get('/cloud-metrics/overview', authenticate, cloudMetricsController.getOverview);
app.get('/cloud-metrics/sync-health', authenticate, cloudMetricsController.getSyncHealth);
app.get('/cloud-metrics/terminals', authenticate, cloudMetricsController.getTerminals);
app.get('/cloud-metrics/devices', authenticate, cloudMetricsController.getDevices);
app.get('/cloud-metrics/backups', authenticate, cloudMetricsController.getBackups);
app.get('/cloud-metrics/activity-feed', authenticate, cloudMetricsController.getActivityFeed);
app.get('/cloud-metrics/alerts', authenticate, cloudMetricsController.getAlerts);


app.get('/api/payout/platform-settings', authenticate, AdminController.getPlatformPayoutSettingsPublic);

// Global Settings (Super Admin Only)
app.get('/admin/settings', authenticate, checkRole(['super_admin']), AdminController.getGlobalSettings);
app.patch('/admin/settings', authenticate, checkRole(['super_admin']), AdminController.updateGlobalSettings);
app.get('/admin/settings/commissions', authenticate, checkRole(['super_admin']), AdminController.getGlobalCommissions);
app.patch('/admin/settings/commissions', authenticate, checkRole(['super_admin']), AdminController.updateGlobalCommissions);
app.post('/admin/broadcast', authenticate, checkRole(['super_admin']), AdminController.sendBroadcast);

// Quasar POS encryption key (card switch ICC crypto)
app.get('/admin/quasar/integrations', authenticate, checkRole(['super_admin']), AdminController.listQuasarIntegrations);
app.get('/admin/quasar/pos-encryption-key/status', authenticate, checkRole(['super_admin']), AdminController.getQuasarPosEncryptionKeyStatus);
app.post('/admin/quasar/pos-encryption-key/rotate', authenticate, checkRole(['super_admin']), AdminController.rotateQuasarPosEncryptionKey);
app.post('/admin/quasar/pos-encryption-key/store', authenticate, checkRole(['super_admin']), AdminController.storeQuasarPosEncryptionKey);
app.get('/admin/quasar/api-key/status', authenticate, checkRole(['super_admin']), AdminController.getQuasarApiKeyStatus);
app.post('/admin/quasar/api-key/issue-live', authenticate, checkRole(['super_admin']), AdminController.issueQuasarLiveApiKey);

// Commission Command Center
app.get('/admin/commissions/approvals', authenticate, checkRole(['super_admin']), CommissionController.listApprovals);
app.post('/admin/commissions/approvals/:id/approve', authenticate, checkRole(['super_admin']), CommissionController.approveCommission);
app.post('/admin/commissions/approvals/:id/reject', authenticate, checkRole(['super_admin']), CommissionController.rejectCommission);
app.post('/admin/commissions/clawback', authenticate, checkRole(['super_admin']), CommissionController.executeClawback);
app.get('/admin/commissions/audit', authenticate, checkRole(['super_admin']), CommissionController.listAuditHistory);
app.get('/admin/commissions/agents/progress', authenticate, checkRole(['super_admin']), CommissionController.listAgentProgress);
app.get('/admin/commissions/plans', authenticate, checkRole(['super_admin']), CommissionController.listPlansAndTargets);
app.get('/admin/commissions/budgets', authenticate, checkRole(['super_admin']), CommissionController.listCampaignsAndBudgets);
app.post('/admin/commissions/simulate', authenticate, checkRole(['super_admin']), CommissionController.simulateCommission);

// Plans & Targets CRUD Endpoints
app.post('/admin/commissions/programs', authenticate, checkRole(['super_admin']), CommissionController.createProgram);
app.put('/admin/commissions/programs/:id', authenticate, checkRole(['super_admin']), CommissionController.updateProgram);
app.delete('/admin/commissions/programs/:id', authenticate, checkRole(['super_admin']), CommissionController.deleteProgram);
app.post('/admin/commissions/programs/:id/versions', authenticate, checkRole(['super_admin']), CommissionController.createVersion);
app.post('/admin/commissions/versions/:id/clone', authenticate, checkRole(['super_admin']), CommissionController.cloneVersion);
app.post('/admin/commissions/versions/:id/activate', authenticate, checkRole(['super_admin']), CommissionController.activateVersion);
app.put('/admin/commissions/versions/:id/rules', authenticate, checkRole(['super_admin']), CommissionController.updateVersionRules);
app.delete('/admin/commissions/versions/:id', authenticate, checkRole(['super_admin']), CommissionController.deleteVersion);

app.post('/admin/commissions/category-rules', authenticate, checkRole(['super_admin']), CommissionController.createCategoryRule);
app.put('/admin/commissions/category-rules/:id', authenticate, checkRole(['super_admin']), CommissionController.updateCategoryRule);
app.delete('/admin/commissions/category-rules/:id', authenticate, checkRole(['super_admin']), CommissionController.deleteCategoryRule);

app.post('/admin/commissions/performance-rules', authenticate, checkRole(['super_admin']), CommissionController.createPerformanceRule);
app.put('/admin/commissions/performance-rules/:id', authenticate, checkRole(['super_admin']), CommissionController.updatePerformanceRule);
app.delete('/admin/commissions/performance-rules/:id', authenticate, checkRole(['super_admin']), CommissionController.deletePerformanceRule);

app.post('/admin/commissions/terminal-rules', authenticate, checkRole(['super_admin']), CommissionController.createTerminalRule);
app.put('/admin/commissions/terminal-rules/:id', authenticate, checkRole(['super_admin']), CommissionController.updateTerminalRule);
app.delete('/admin/commissions/terminal-rules/:id', authenticate, checkRole(['super_admin']), CommissionController.deleteTerminalRule);

// Subscriptions
app.post('/admin/subscriptions/extend', authenticate, checkRole(['super_admin']), AdminController.extendSubscription);
app.get('/api/subscription/status', authenticate, AdminController.getSubscriptionStatus);

// API Endpoints for Admin (Invify Pro App / Operator App)
// User Device Controls & Audit Archiving (Super Admin only)
app.get('/api/admin/user-devices', authenticate, checkRole(['super_admin']), UserController.listDevices);
app.post('/api/admin/user-devices/approve', authenticate, checkRole(['super_admin']), UserController.approveDevice);
app.post('/api/admin/user-devices/block', authenticate, checkRole(['super_admin']), UserController.blockDevice);
app.post('/api/admin/audit/archive', authenticate, checkRole(['super_admin']), UserController.triggerArchiving);
app.post('/admin/devices/:deviceId/upgrade-to-company', authenticate, checkRole(['super_admin']), DeviceController.upgradeToCompany);



// Device Activation Hub Endpoints
app.get('/devices', authenticate, DeviceController.getDevices);
app.get('/devices/activations', authenticate, DeviceController.getActivations);
app.post('/devices/activations', authenticate, DeviceController.createActivation);
app.post('/devices/validate', DeviceController.validateCode);
app.post('/devices/onboard', authenticate, DeviceController.onboardDevice);
app.patch('/devices/:id', authenticate, DeviceController.updateDevice);
app.patch('/devices/activations/:code/reset', authenticate, checkRole(['super_admin']), DeviceController.resetActivation);

// ─── DEVICE TELEMETRY & FLEET VISIBILITY ──────────────────────────────────────
app.get('/api/devices/:deviceId/status', authenticate, DeviceController.getDeviceStatus);
app.get('/api/devices/:deviceId/telemetry', authenticate, DeviceController.getDeviceTelemetry);
app.get('/api/devices/:deviceId/alerts', authenticate, DeviceController.getDeviceAlerts);

// Terminal Sync (Public for mobile app)
app.post('/api/mobile/terminal/sync', authenticate, TerminalController.mobileSync);
app.post('/api/mobile/terminal/keyexchange-success', TerminalController.keyExchangeSuccess);
app.get('/api/mobile/terminal/status', TerminalController.mobileStatus);

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
app.post('/admin/tenants/:id/provision-virtual-account', authenticate, checkTenantAccess, AdminController.provisionVirtualAccount);
app.post('/admin/tenants/:id/students/:studentId/provision-va', authenticate, checkTenantAccess, AdminController.provisionStudentVirtualAccount);
app.post('/admin/tenants/:id/customers/:customerId/provision-va', authenticate, checkTenantAccess, AdminController.provisionCustomerVirtualAccount);
app.get('/admin/ledger', authenticate, checkTenantAccess, AdminController.listLedger);
app.get('/admin/payments', authenticate, checkTenantAccess, AdminController.listPayments);

// Wallet Endpoints (Internal Ledger)
app.get('/api/v1/wallet', authenticate, checkTenantAccess, WalletController.getBalance);
app.get('/api/v1/wallet/transactions', authenticate, checkTenantAccess, WalletController.getTransactions);

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

// Reconciliation Endpoints
app.get('/api/reconciliation', authenticate, checkTenantPermission('reconciliation.view'), ReconciliationController.getReport);

// Reconciliation detail tabs
app.get('/api/reconciliation/:id/details', authenticate, checkTenantPermission('reconciliation.view'), ReconciliationController.getDetails);
app.get('/api/reconciliation/:id/ledger', authenticate, checkTenantPermission('reconciliation.view'), ReconciliationController.getLedger);
app.get('/api/reconciliation/:id/settlement', authenticate, checkTenantPermission('reconciliation.view'), ReconciliationController.getSettlement);
app.get('/api/reconciliation/:id/wallet', authenticate, checkTenantPermission('reconciliation.view'), ReconciliationController.getWallet);
app.get('/api/reconciliation/:id/card', authenticate, checkTenantPermission('reconciliation.view'), ReconciliationController.getCard);
app.get('/api/reconciliation/:id/bank', authenticate, checkTenantPermission('reconciliation.view'), ReconciliationController.getBank);
app.get('/api/reconciliation/:id/audit', authenticate, checkTenantPermission('reconciliation.audit.view'), ReconciliationController.getAudit);
app.get('/api/reconciliation/:id/timeline', authenticate, checkTenantPermission('reconciliation.timeline.view'), ReconciliationController.getTimeline);

// Reconciliation Commands
app.post('/api/reconciliation/:id/assign', authenticate, checkTenantPermission('reconciliation.assign'), ReconciliationController.assign);
app.post('/api/reconciliation/:id/escalate', authenticate, checkTenantPermission('reconciliation.escalate'), ReconciliationController.escalate);
app.post('/api/reconciliation/:id/resolve', authenticate, checkTenantPermission('reconciliation.resolve'), ReconciliationController.resolve);
app.post('/api/reconciliation/:id/force_match', authenticate, checkTenantPermission('reconciliation.force_match'), ReconciliationController.forceMatch);
app.post('/api/reconciliation/:id/retry', authenticate, checkTenantPermission('reconciliation.retry'), ReconciliationController.retry);
app.post('/api/reconciliation/:id/lock', authenticate, checkTenantPermission('reconciliation.lock'), ReconciliationController.lock);
app.post('/api/reconciliation/:id/unlock', authenticate, checkTenantPermission('reconciliation.unlock'), ReconciliationController.unlock);
// Payout Configuration
app.get('/api/payout/settings', authenticate, PayoutController.getSettings);
app.post('/api/payout/settings', authenticate, PayoutController.saveSettings);
app.post('/api/payout/withdraw', authenticate, PayoutController.withdraw);
app.get('/api/payout/history', authenticate, PayoutController.getHistory);
app.get('/api/payout/banks', authenticate, PayoutController.getBanks);
app.post('/api/payout/resolve-account', authenticate, PayoutController.resolveAccount);

// Executive Dashboard
app.get('/api/finance/executive-summary', authenticate, checkRole(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), ExecutiveFinanceController.getSummary);
app.get('/api/finance/quasar-transactions', authenticate, checkRole(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin']), ExecutiveFinanceController.getQuasarTransactions);
app.get('/api/finance/missed-payments', authenticate, checkRole(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), ExecutiveFinanceController.getMissedPayments);
app.get('/api/finance/audit/ledger', authenticate, AuditController.getTransactionLedger);

// POS Operations (Medusa | Cpoint-Kimono | NIBSS)
app.post('/api/pos/transaction', authenticate, PosController.processTransaction);
app.post('/api/pos/transactionFromMpos', authenticate, PosController.processTransaction);
app.post('/api/v1/pos/transactionFromMpos', authenticate, PosController.processTransaction);
app.get('/api/pos/history', authenticate, PosController.getTransactionHistory);
app.post('/api/pos/test-iso', authenticate, PosController.testIso);  // ISO8583 debug parser
app.get('/admin/pos/routing', authenticate, checkRole(['super_admin', 'owner', 'admin']), PosController.getRoutingConfig);
app.post('/admin/pos/routing', authenticate, checkRole(['super_admin', 'owner', 'admin']), PosController.updateRoutingConfig);
app.get('/admin/pos/routing/affected-devices', authenticate, checkRole(['super_admin', 'owner', 'admin']), PosController.getAffectedDevices);
app.post('/admin/pos/kimono-params/refresh', authenticate, checkRole(['super_admin', 'owner', 'admin']), PosController.refreshKimonoParams);
app.get('/admin/pos/observability', authenticate, checkRole(['super_admin', 'owner', 'admin']), PosController.getObservabilityMetrics);
app.post('/admin/pos/simulate', authenticate, checkRole(['super_admin', 'owner', 'admin']), PosController.simulateRoute);

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
app.post('/api/admin/inventory/assignments/:id/unassign', authenticate, TerminalController.unassignHardware);
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
app.post('/api/finance/student-virtual-account/:studentId', authenticate, StudentController.provisionStudentVirtualAccount);
app.post('/api/finance/customer-virtual-account/:customerId', authenticate, CustomerController.getVirtualAccount);
app.post('/api/finance/staff-virtual-account/:userId', authenticate, CustomerController.getStaffVirtualAccount);
app.get('/api/finance/virtual-accounts', authenticate, CustomerController.listTenantVirtualAccounts);
app.get('/api/finance/virtual-accounts/:accountNumber/transactions', authenticate, CustomerController.getVirtualAccountTransactions);
app.post('/api/finance/virtual-accounts/:accountNumber/sweep', authenticate, CustomerController.sweepVirtualAccountFunds);

// School-mode Web Sync (students, academics, teachers, results)
app.post(
  '/api/school/bulk-sync',
  authenticate,
  checkRole(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']),
  SchoolSyncController.bulkSync,
);
app.get(
  '/api/school/roster',
  authenticate,
  checkRole(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']),
  SchoolSyncController.getRoster,
);

// School payments + disputes (device Cash/POS → tenant admin web)
app.post(
  '/api/school/payments/sync',
  authenticate,
  checkRole(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']),
  SchoolPaymentsController.syncPayments,
);
app.get(
  '/api/school/payments',
  authenticate,
  checkRole(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']),
  SchoolPaymentsController.listPayments,
);
app.post(
  '/api/school/payment-disputes',
  authenticate,
  checkRole(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']),
  SchoolPaymentsController.raiseDispute,
);
app.get(
  '/api/school/payment-disputes',
  authenticate,
  checkRole(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']),
  SchoolPaymentsController.listDisputes,
);
app.patch(
  '/api/school/payment-disputes/:id',
  authenticate,
  checkRole(['super_admin', 'tenant_admin', 'owner', 'admin', 'finance_staff']),
  SchoolPaymentsController.updateDispute,
);

// CRM Routes
app.get('/api/v1/crm/customers', authenticate, CustomerController.searchCustomers);
app.get('/api/v1/crm/customers/:id', authenticate, CustomerController.getCustomerSummary);
app.post('/api/v1/crm/customers', authenticate, CustomerController.createCustomer);
app.put('/api/v1/crm/customers/:id', authenticate, CustomerController.updateCustomer);

// ─── GOVERNANCE AUDIT LEDGER ROUTES ────────────────────────────────────────

// GET /api/admin/audit/ledger  ─  Unified multi-source audit ledger
app.get('/api/admin/audit/ledger', authenticate, checkRole(['super_admin', 'internal_staff']), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || req.headers['x-tenant-id'];
    const query = { ...req.query, tenantId };
    const result = await GovAuditService.getLedger(query as any);
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
app.post('/api/admin/emergency-lock', authenticate, checkRole(['super_admin', 'internal_staff']), async (req: Request, res: Response) => {
  try {
    const { tenant_id, passcode } = req.body;
    if (!tenant_id || !passcode) {
      return res.status(400).json({ success: false, message: 'Missing tenant_id or passcode' });
    }

    // Supabase update — sole persistence path (P0-5A: removed JSON fallback)
    const { supabase: sb } = require('./db/supabase');
    await sb.from('tenants').update({ emergency_lock_code: passcode, is_emergency_locked: true }).eq('id', tenant_id);

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
  console.error(`[Global Error] [${(req as any).correlationId || 'NO-CORRELATION'}]`, err.stack);
  
  const status = err.status || 500;
  
  let code = err.code || 'ERR_INTERNAL_SERVER';
  if (status === 400) code = 'ERR_BAD_REQUEST';
  if (status === 401) code = 'ERR_UNAUTHORIZED';
  if (status === 403) code = 'ERR_FORBIDDEN';
  if (status === 404) code = 'ERR_NOT_FOUND';
  if (status === 422) code = 'ERR_UNPROCESSABLE_ENTITY';
  if (status === 429) code = 'ERR_TOO_MANY_REQUESTS';

  res.status(status).json({
    success: false,
    code,
    message: err.message || 'Internal Server Error',
    correlationId: (req as any).correlationId,
    details: err.details || {}
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

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    // OFFLINE MOCK AUTH BYPASS — for local device sessions (no Supabase session)
    if (token === 'mock-super-admin') {
      const tenantId = socket.handshake.auth?.tenantId || 
                       socket.handshake.query?.tenantId as string ||
                       socket.handshake.headers?.['x-tenant-id'] as string;
      console.warn(`[Socket.io] mock-super-admin socket bypass. tenantId=${tenantId}`);
      socket.data.user = { id: 'mock-super-admin', role: 'admin', tenant_id: tenantId };
      socket.data.tenantId = tenantId;
      return next();
    }

    // OFFLINE LOCAL AUTH BYPASS — for locally-signed JWT tokens
    if (process.env.OFFLINE_LOCAL_AUTH === 'true' && token && token.includes('local_dev_signature')) {
      const b64Payload = token.split('.')[1];
      if (b64Payload) {
        const decoded = JSON.parse(Buffer.from(b64Payload, 'base64').toString('utf-8'));
        socket.data.user = decoded;
        socket.data.tenantId = decoded.tenantId;
        return next();
      }
    }

    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    const { supabaseAdmin } = require('./db/supabase');
    const jwt = require('jsonwebtoken');
    
    // Decode token instead of using supabase.auth.getUser since it might be an offline token
    const jwtPayload = jwt.decode(token);
    if (!jwtPayload) {
      return next(new Error('Authentication error: Malformed token'));
    }
    
    const userId = jwtPayload.sub || jwtPayload.id;
    const userEmail = jwtPayload.email || jwtPayload.user_metadata?.email || '';
    if (!userId) {
      return next(new Error('Authentication error: Missing subject claim'));
    }

    let profile = null;
    let profileErr = null;
    const socketDbTimeoutMs = Number(process.env.AUTH_DB_TIMEOUT_MS || 8000);
    try {
      const byIdPromise = supabaseAdmin
        .from('users')
        .select('tenant_id, role, email')
        .eq('id', userId)
        .maybeSingle();
      const timed = await Promise.race([
        byIdPromise,
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('socket users.byId timeout')), socketDbTimeoutMs),
        ),
      ]);
      profile = timed.data;
      profileErr = timed.error;

      if (!profile && userEmail) {
        const byEmailPromise = supabaseAdmin
          .from('users')
          .select('tenant_id, role, email')
          .ilike('email', String(userEmail).trim())
          .maybeSingle();
        const timedEmail = await Promise.race([
          byEmailPromise,
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error('socket users.byEmail timeout')), socketDbTimeoutMs),
          ),
        ]);
        if (timedEmail.data) {
          profile = timedEmail.data;
          profileErr = null;
        }
      }
    } catch (dbErr) {
      profileErr = dbErr;
    }

    if (profileErr || !profile) {
      const fallbackTenantId =
        jwtPayload.tenant_id ||
        jwtPayload.tenantId ||
        jwtPayload.app_metadata?.tenantId ||
        jwtPayload.user_metadata?.tenantId ||
        socket.handshake.auth?.tenantId ||
        (socket.handshake.query?.tenantId as string);
      if (fallbackTenantId) {
        console.warn(
          `[Socket.io] User profile not found for ${userId}. Using JWT/handshake tenantId=${fallbackTenantId}.`,
        );
        profile = { tenant_id: fallbackTenantId, role: jwtPayload.role || 'admin' };
      } else if (process.env.NODE_ENV === 'development' || process.env.OFFLINE_MOCK_AUTH === 'true') {
        console.warn(
          `[Socket.io] User profile not found in DB for user ${userId}. Falling back to dev mock profile.`,
        );
        profile = {
          tenant_id:
            jwtPayload.tenant_id || jwtPayload.tenantId || '71ac6795-6c26-4efd-80db-12bfe4126b47',
          role: 'admin',
        };
      } else {
        return next(new Error('Authentication error: User profile not found'));
      }
    }

    socket.data.user = { id: userId, ...profile };
    socket.data.tenantId = profile.tenant_id;
    next();
  } catch (err) {
    next(new Error('Authentication error: Server error'));
  }
});

io.on('connection', (socket: Socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id} (Tenant: ${socket.data.tenantId})`);
  
  // Clients will emit 'join_room' passing their characteristics
  socket.on('join_room', (data: any) => {
    const joined = ['all'];
    // IGNORE data.tenantId, force authenticated tenantId
    if (socket.data.tenantId) { 
      socket.join(`tenant:${socket.data.tenantId}`); 
      joined.push(`tenant:${socket.data.tenantId}`); 
    }
    if (data.plan) { socket.join(`plan:${String(data.plan).toLowerCase()}`); joined.push(`plan:${data.plan}`); }
    if (data.type) { socket.join(`type:${String(data.type).toLowerCase()}`); joined.push(`type:${data.type}`); }
    if (data.deviceId) { socket.join(`device:${data.deviceId}`); joined.push(`device:${data.deviceId}`); }
    if (data.businessName) { socket.join(`business:${data.businessName}`); joined.push(`business:${data.businessName}`); }
    socket.join('all');
    console.log(`[Socket.io] Client ${socket.id} joined rooms: ${joined.join(', ')}`);
  });

  // Listen for real-time location updates from the mobile app
  socket.on('location_update', (data: any) => {
    console.log(`[Socket.io] Location update from ${socket.id}: lat=${data.lat}, lng=${data.lng}`);
    // Broadcast to all connected admin dashboards
    io.to('all').emit('tenant_location', {
      socketId: socket.id,
      tenantId: data.tenantId || 'unknown',
      lat: data.lat,
      lng: data.lng
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// OS Telemetry Polling Loop (Server Metrics for Contabo)
import * as os from 'os';
setInterval(() => {
  // Simple CPU usage estimation based on load average
  const cpus = os.cpus();
  const loadAvg = os.loadavg()[0]; // 1 minute load average
  const cpuUsage = Math.min(100, Math.round((loadAvg / cpus.length) * 100));
  
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsage = Math.round((usedMem / totalMem) * 100);

  // Broadcast real server telemetry to connected clients
  io.to('all').emit('system_telemetry', {
    cpu: { label: 'CPU Usage', value: cpuUsage, color: cpuUsage > 80 ? 'red-4' : 'cyan-4' },
    memory: { label: 'Memory Usage', value: memoryUsage, color: memoryUsage > 80 ? 'red-4' : 'purple-4' },
    storage: { label: 'Disk Space', value: 32, color: 'teal-4' }, // Still mocked as os doesn't support disk natively without external lib
    network: { label: 'Network I/O', value: Math.floor(Math.random() * 40) + 10, color: 'amber-4' } // Simulated dynamic
  });
}, 5000);


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
  // Run Nightly Reconciliation Job periodically (once every 24 hours)
  setInterval(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1); // Yesterday's date
    const dateStr = targetDate.toISOString().split('T')[0];
    
    const dbStore = new DatabaseStore();
    const quasarConnector = new QuasarConnector(null, null);
    const investigationQueueService = new InvestigationQueueService(dbStore, console);
    const job = new NightlyReconciliationJob(quasarConnector, dbStore, investigationQueueService, console);
    
    job.run(dateStr).catch((err: any) => {
      console.error('[NightlyReconciliation] Scheduled job failed:', err.message);
    });
  }, 24 * 60 * 60 * 1000);

  server.listen(PORT as number, '0.0.0.0', () => {
    console.log(`🚀 Invify SaaS (TS) running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    // Hydrate Quasar webhook signing secret from Integration Vault after boot
    (async () => {
      try {
        if (process.env.QUASAR_WEBHOOK_SIGNING_SECRET) return;
        const { IntegrationVaultService } = await import('./services/integration-vault.service');
        for (const envName of ['PRODUCTION', 'SANDBOX'] as const) {
          const secret = await IntegrationVaultService.getDecryptedCredential(
            'quasar',
            envName,
            undefined,
            'QUASAR_WEBHOOK_SIGNING_SECRET',
          );
          if (secret) {
            process.env.QUASAR_WEBHOOK_SIGNING_SECRET = secret;
            console.log(`[Boot] Hydrated QUASAR_WEBHOOK_SIGNING_SECRET from Integration Vault (${envName})`);
            break;
          }
        }
      } catch (err: any) {
        console.warn('[Boot] Could not hydrate Quasar webhook secret from vault:', err?.message || err);
      }
    })();
  });
}

export default app;

// touch2
