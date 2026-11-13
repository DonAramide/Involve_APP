"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
// src/app.ts (reloaded)
const express_1 = __importDefault(require("express"));
const http = __importStar(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const load_env_1 = require("./config/load-env");
const build_variant_1 = require("./config/build-variant");
(0, load_env_1.loadEnv)();
const isJest = typeof process.env.JEST_WORKER_ID !== 'undefined';
// Bypass Node 18+ strict TLS and IPv6 fetch failures ONLY in local mode for local Supabase emulator
try {
    const variant = build_variant_1.BuildVariantService.getInstance();
    if (variant.isLocal()) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
}
catch {
    const rawVariant = (process.env.BUILD_VARIANT || '').trim().toUpperCase();
    const appEnv = (process.env.APP_ENV || '').trim().toLowerCase();
    const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
    const isProtected = nodeEnv === 'production' || nodeEnv === 'staging' ||
        appEnv === 'production' || appEnv === 'staging' ||
        rawVariant === 'PROD' || rawVariant === 'STAGING';
    if (isProtected) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
    else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
}
const node_dns_1 = __importDefault(require("node:dns"));
node_dns_1.default.setDefaultResultOrder('ipv4first');
// 1. IMPORTS (Controllers & Middleware)
const payment_controller_1 = require("./controllers/payment.controller");
const onboarding_controller_1 = require("./controllers/onboarding.controller");
const settings_controller_1 = require("./controllers/settings.controller");
const invite_controller_1 = require("./controllers/invite.controller");
const ai_controller_1 = require("./controllers/ai.controller");
const admin_controller_1 = require("./controllers/admin.controller");
const tenant_institute_port_controller_1 = require("./controllers/tenant-institute-port.controller");
const platform_fee_profiles_controller_1 = require("./controllers/platform-fee-profiles.controller");
const platform_fee_assessments_controller_1 = require("./controllers/platform-fee-assessments.controller");
const platform_fee_distribution_controller_1 = require("./controllers/platform-fee-distribution.controller");
const register_routes_1 = require("./modules/tenant-billing/register-routes");
const register_routes_2 = require("./modules/health-insurance/register-routes");
const agent_webhook_controller_1 = require("./modules/agent-portal/controllers/agent-webhook.controller");
const analytics_controller_1 = require("./controllers/analytics.controller");
const wallet_controller_1 = require("./controllers/wallet.controller");
const user_controller_1 = require("./controllers/user.controller");
const maker_checker_controller_1 = require("./controllers/maker-checker.controller");
const audit_archive_service_1 = require("./services/audit-archive.service");
const gov_audit_service_1 = require("./services/gov-audit.service");
const curriculum_controller_1 = require("./controllers/curriculum.controller");
const billing_controller_1 = require("./controllers/billing.controller");
const referral_controller_1 = require("./controllers/referral.controller");
const attendance_controller_1 = require("./controllers/attendance.controller");
const school_card_routes_1 = require("./modules/school-gate/school-card.routes");
const insights_controller_1 = require("./controllers/insights.controller");
const retention_controller_1 = require("./controllers/retention.controller");
const webhook_controller_1 = require("./controllers/webhook.controller");
const whatsapp_webhook_controller_1 = require("./controllers/whatsapp-webhook.controller");
const reconciliation_controller_1 = require("./controllers/reconciliation.controller");
const student_controller_1 = require("./controllers/student.controller");
const school_sync_controller_1 = require("./controllers/school-sync.controller");
const school_payments_controller_1 = require("./controllers/school-payments.controller");
const term_bills_controller_1 = require("./controllers/term-bills.controller");
const parent_broadcast_controller_1 = require("./controllers/parent-broadcast.controller");
const staff_controller_1 = require("./controllers/staff.controller");
const payout_controller_1 = require("./controllers/payout.controller");
const finance_controller_1 = require("./controllers/finance.controller");
const defaulters_controller_1 = require("./controllers/defaulters.controller");
const integrity_controller_1 = require("./controllers/integrity.controller");
const notification_controller_1 = require("./controllers/notification.controller");
const audit_controller_1 = require("./controllers/audit.controller");
const otp_controller_1 = require("./controllers/otp.controller");
const auth_controller_1 = require("./controllers/auth.controller");
const device_controller_1 = require("./controllers/device.controller");
const support_controller_1 = require("./controllers/support.controller");
const lookup_controller_1 = require("./controllers/lookup.controller");
const customer_controller_1 = require("./controllers/customer.controller");
const pos_controller_1 = require("./controllers/pos.controller");
const terminal_controller_1 = require("./controllers/terminal.controller");
const search_controller_1 = require("./controllers/search.controller");
const orchestration_controller_1 = require("./controllers/orchestration.controller");
const runtime_controller_1 = require("./controllers/runtime.controller");
const agent_controller_1 = require("./modules/agent-portal/agent.controller");
const admin_agent_controller_1 = require("./modules/agent-portal/controllers/admin-agent.controller");
const cloud_metrics_controller_1 = require("./controllers/cloud-metrics.controller");
const dashboard_controller_1 = require("./controllers/dashboard.controller");
const commission_controller_1 = require("./controllers/commission.controller");
const quasar_health_controller_1 = require("./controllers/quasar-health.controller");
const NightlyReconciliationJob_1 = require("./modules/financial-platform/reconciliation/NightlyReconciliationJob");
const DatabaseStore_1 = require("./modules/financial-platform/infrastructure/DatabaseStore");
const InvestigationQueueService_1 = require("./modules/financial-platform/reconciliation/InvestigationQueueService");
const QuasarConnector_1 = require("./modules/financial-platform/infrastructure/QuasarConnector");
const health_controller_1 = require("./controllers/health.controller");
const financial_dispute_controller_1 = require("./controllers/financial-dispute.controller");
const production_env_controller_1 = require("./controllers/production-env.controller");
const auth_middleware_1 = require("./middleware/auth.middleware");
const rbac_middleware_1 = require("./middleware/rbac.middleware");
const require_admin_mfa_middleware_1 = require("./middleware/require-admin-mfa.middleware");
const correlation_middleware_1 = require("./middleware/correlation.middleware");
const app = (0, express_1.default)();
app.set('trust proxy', 1);
app.use(correlation_middleware_1.correlationIdMiddleware);
const PORT = process.env.PORT || 3004;
// 1. GLOBAL MIDDLEWARE
app.disable('x-powered-by'); // Prevent framework fingerprinting
app.use((req, res, next) => {
    if (req.path.startsWith('/socket.io'))
        return next();
    return (0, helmet_1.default)({
        // HTTP LAN tablets abort polling if Helmet advertises HTTPS-only.
        strictTransportSecurity: false,
        contentSecurityPolicy: {
            useDefaults: true,
            directives: { 'upgrade-insecure-requests': null },
        },
    })(req, res, next);
});
// Dynamic CORS Configuration
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:5173']);
function isCorsOriginAllowed(origin) {
    if (!origin)
        return true; // Mobile native clients, curl, server-to-server
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return true;
    }
    // In non-production (LOCAL or STAGING development), allow localhost, 127.0.0.1, and private LAN IPs on any port
    let isStrictProd = false;
    try {
        isStrictProd = process.env.NODE_ENV === 'production' || build_variant_1.BuildVariantService.getInstance().isProd();
    }
    catch {
        isStrictProd = process.env.NODE_ENV === 'production';
    }
    if (!isStrictProd) {
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return true;
        }
        if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
            return true;
        }
    }
    return false;
}
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (isCorsOriginAllowed(origin)) {
            callback(null, true);
        }
        else {
            callback(null, false);
        }
    },
    credentials: true
}));
// Request Payload Limits
const maxPayloadSize = process.env.MAX_REQUEST_SIZE || '2mb';
app.use(express_1.default.json({
    limit: maxPayloadSize,
    verify: (req, res, buf) => {
        req.rawBody = buf; // Capture raw body for signature verification
    }
}));
app.use(express_1.default.urlencoded({ extended: true, limit: maxPayloadSize }));
// Staging nginx `location /api/` uses `proxy_pass http://127.0.0.1:3004/;` (trailing
// slash), which strips `/api` before Node. Canonical routes are `/api/...`.
// Restore the prefix except for handlers that exist only on the unprefixed path.
// `/devices` is excluded because nginx also proxies `/devices/` unstripped.
app.use((req, _res, next) => {
    const path = req.path || '';
    if (path === '/api' || path.startsWith('/api/'))
        return next();
    if (path.startsWith('/socket.io'))
        return next();
    const passthrough = path === '/livez' || path === '/readyz' || path === '/health' ||
        path === '/liveness' || path === '/readiness' || path === '/healthz' ||
        path.startsWith('/payments') ||
        path.startsWith('/public') ||
        path.startsWith('/uploads') ||
        path.startsWith('/webhooks') ||
        path.startsWith('/auth') ||
        path === '/devices' || path.startsWith('/devices/');
    if (passthrough)
        return next();
    req.url = '/api' + (req.url.startsWith('/') ? req.url : `/${req.url}`);
    next();
});
// Rate Limiting Middlewares
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || '900000', 10), // Default: 15 mins
    max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '10000', 10),
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10), // Default: 15 mins
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10000', 10),
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
const verificationLimiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_VERIFICATION_WINDOW_MS || '3600000', 10), // Default: 1 hour
    max: parseInt(process.env.RATE_LIMIT_VERIFICATION_MAX || '30', 10),
    message: { error: 'Too many verification attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use((0, morgan_1.default)('dev'));
// In-process Observability metrics interceptor
const observability_collector_service_1 = require("./services/observability/observability-collector.service");
app.use((req, res, next) => {
    const reqPath = String(req.originalUrl || req.path || req.url || '');
    // Explicitly exclude observability endpoints and health probes from request metrics
    if (reqPath.startsWith('/api/admin/observability') ||
        reqPath.startsWith('/admin/observability') ||
        req.headers['x-monitoring-probe'] === 'true') {
        return next();
    }
    const start = Date.now();
    res.on('finish', () => {
        try {
            const latency = Date.now() - start;
            observability_collector_service_1.ObservabilityCollectorService.getInstance().recordHttpRequest(req.method, reqPath, res.statusCode, latency);
        }
        catch {
            // Non-blocking in-memory collector
        }
    });
    next();
});
app.use((req, res, next) => {
    if (req.method !== 'POST')
        return next();
    const path = String(req.originalUrl || req.url || '');
    if (!/\/webhooks\/quasar(?:\?|$)/i.test(path) && !/\/webhooks\/quasar$/i.test(req.path || '')) {
        return next();
    }
    const started = Date.now();
    res.on('finish', () => {
        const raw = req.rawBody;
        const bodyLength = Buffer.isBuffer(raw)
            ? raw.length
            : Number(req.headers['content-length'] || 0);
        console.log(`[WebhookAccess] ${req.method} ${path} status=${res.statusCode} bodyLength=${bodyLength} ip=${req.ip} delivery=${req.headers['x-quasar-delivery-id'] || '-'} ms=${Date.now() - started}`);
    });
    next();
});
app.use((req, res, next) => {
    if (req.path.startsWith('/socket.io'))
        return next();
    return globalLimiter(req, res, next);
});
const path_1 = __importDefault(require("path"));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
// 2. ROUTES
// Health contract (Phase 3): /livez (alive), /readyz (traffic-ready), /health (compat)
app.get('/livez', health_controller_1.HealthController.livez);
app.get('/readyz', health_controller_1.HealthController.readyz);
app.get('/health', health_controller_1.HealthController.health);
app.get('/api/livez', health_controller_1.HealthController.livez);
app.get('/api/readyz', health_controller_1.HealthController.readyz);
app.get('/api/health', health_controller_1.HealthController.health);
// Legacy aliases — same handlers (documented; prefer /livez|/readyz)
app.get('/liveness', health_controller_1.HealthController.livez);
app.get('/readiness', health_controller_1.HealthController.readyz);
app.get('/healthz', health_controller_1.HealthController.livez);
// Payment Endpoints — authenticated + role-gated; tenant from identity (not client headers)
app.post('/payments/create', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury', 'finance_staff']), rbac_middleware_1.checkTenantAccess, payment_controller_1.PaymentController.createPayment);
app.post('/payments/initialize', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury', 'finance_staff']), rbac_middleware_1.checkTenantAccess, payment_controller_1.PaymentController.initializeGatewayCheckout);
app.post('/payments/intents', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury', 'finance_staff']), rbac_middleware_1.checkTenantAccess, payment_controller_1.PaymentController.createPayment);
app.get('/payments/intents/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury', 'finance_staff']), payment_controller_1.PaymentController.getPaymentIntent);
app.post('/payments/intents/:id/cancel', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury']), payment_controller_1.PaymentController.cancelPaymentIntent);
app.post('/payments/intents/:id/refund', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury']), payment_controller_1.PaymentController.refundPaymentIntent);
app.get('/payments/history', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury', 'finance_staff']), rbac_middleware_1.checkTenantAccess, payment_controller_1.PaymentController.getPaymentHistory);
// Public Onboarding & System Lookup Data
app.get('/settings/onboarding', settings_controller_1.SettingsController.getOnboardingSettings);
app.get('/api/settings/onboarding', settings_controller_1.SettingsController.getOnboardingSettings);
app.put('/api/settings/onboarding', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner']), settings_controller_1.SettingsController.updateOnboardingSettings);
app.get('/public/lookup', lookup_controller_1.LookupController.getLookup);
app.post('/admin/lookup', lookup_controller_1.LookupController.saveLookup);
app.post('/public/otp/send', verificationLimiter, otp_controller_1.OTPController.sendOTP);
app.post('/public/otp/verify', verificationLimiter, otp_controller_1.OTPController.verifyOTP);
app.post('/public/onboarding/signup', verificationLimiter, onboarding_controller_1.OnboardingController.signup);
app.post('/public/onboarding/provision', verificationLimiter, onboarding_controller_1.OnboardingController.provision);
app.post('/public/onboarding/report-issue', onboarding_controller_1.OnboardingController.reportIssue);
// Platform User Authentication & MFA / Recovery
app.post('/api/auth/login', authLimiter, auth_controller_1.AuthController.login);
app.post('/api/auth/reset-password', authLimiter, auth_controller_1.AuthController.resetPassword);
app.post('/api/auth/change-password', authLimiter, auth_middleware_1.authenticate, auth_controller_1.AuthController.changePassword);
app.post('/api/auth/mfa/setup', authLimiter, auth_controller_1.AuthController.mfaSetup);
app.post('/api/auth/mfa/verify', authLimiter, auth_controller_1.AuthController.mfaVerify);
app.post('/api/auth/refresh', authLimiter, auth_controller_1.AuthController.refresh);
app.post('/api/auth/logout', authLimiter, auth_controller_1.AuthController.logout);
app.get('/api/auth/check-email', onboarding_controller_1.OnboardingController.checkEmail);
app.post('/api/auth/check-email', onboarding_controller_1.OnboardingController.checkEmail);
app.get('/api/auth/check-agent-code', onboarding_controller_1.OnboardingController.checkAgentCode);
app.post('/api/auth/check-agent-code', onboarding_controller_1.OnboardingController.checkAgentCode);
app.post('/api/auth/send-email-otp', verificationLimiter, onboarding_controller_1.OnboardingController.sendEmailOtp);
app.post('/api/auth/verify-email-otp', verificationLimiter, onboarding_controller_1.OnboardingController.verifyEmailOtp);
// Teacher Invitations (Public)
app.get('/public/invites/validate/:token', invite_controller_1.InviteController.validateInvite);
app.post('/public/invites/accept', invite_controller_1.InviteController.acceptInvite);
// AI Generation Endpoints (Flutter uses /api/ai/*, admin may use /ai/*)
app.post('/api/ai/lesson-note/generate', auth_middleware_1.authenticate, ai_controller_1.AIController.generateLessonNote);
app.post('/api/ai/lesson-note/refresh', auth_middleware_1.authenticate, ai_controller_1.AIController.refreshLessonNote);
app.post('/ai/lesson-note/generate', auth_middleware_1.authenticate, ai_controller_1.AIController.generateLessonNote);
app.post('/ai/lesson-note/refresh', auth_middleware_1.authenticate, ai_controller_1.AIController.refreshLessonNote);
// Admin Endpoints
// Collision SPA vs API: register the same handlers on /admin/* (compat) and /api/admin/* (canonical).
const registerCollisionAdmin = (method, pathAfterAdmin, ...handlers) => {
    app[method](`/admin${pathAfterAdmin}`, ...handlers);
    app[method](`/api/admin${pathAfterAdmin}`, ...handlers);
};
const registerApiPair = (method, apiPath, ...handlers) => {
    const canonical = apiPath.startsWith('/api') ? apiPath : `/api${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
    const stripped = canonical.replace(/^\/api/, '') || '/';
    app[method](canonical, ...handlers);
    if (stripped !== canonical) {
        app[method](stripped, ...handlers);
    }
};
/** --- SYSTEM ADMIN (SUPER ADMIN ONLY) --- **/
registerCollisionAdmin('get', '/tenants', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.listTenants);
registerCollisionAdmin('post', '/tenants', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.createTenant);
registerCollisionAdmin('post', '/tenants/ping-missing-identity', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.pingMissingTenantIdentities);
registerCollisionAdmin('post', '/tenants/:id/ping-identity', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.pingTenantIdentity);
registerCollisionAdmin('get', '/verification-log', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.listVerificationLog);
registerCollisionAdmin('get', '/production-env', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), production_env_controller_1.requireProductionEnvGovernor, production_env_controller_1.ProductionEnvController.getSnapshot);
registerCollisionAdmin('post', '/production-env/propose', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), production_env_controller_1.requireProductionEnvGovernor, production_env_controller_1.ProductionEnvController.propose);
registerCollisionAdmin('post', '/production-env/approve', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), production_env_controller_1.requireProductionEnvGovernor, require_admin_mfa_middleware_1.requireCheckerMfa, production_env_controller_1.ProductionEnvController.approve);
registerCollisionAdmin('post', '/production-env/reject', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), production_env_controller_1.requireProductionEnvGovernor, require_admin_mfa_middleware_1.requireCheckerMfa, production_env_controller_1.ProductionEnvController.reject);
registerCollisionAdmin('patch', '/tenants/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.updateTenant);
registerCollisionAdmin('get', '/tenants/:id/institute-port', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), tenant_institute_port_controller_1.TenantInstitutePortController.get);
registerCollisionAdmin('post', '/tenants/:id/institute-port/propose', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), tenant_institute_port_controller_1.TenantInstitutePortController.propose);
registerCollisionAdmin('post', '/tenants/:id/institute-port/approve', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), require_admin_mfa_middleware_1.requireCheckerMfa, tenant_institute_port_controller_1.TenantInstitutePortController.approve);
registerCollisionAdmin('post', '/tenants/:id/institute-port/reject', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), require_admin_mfa_middleware_1.requireCheckerMfa, tenant_institute_port_controller_1.TenantInstitutePortController.reject);
registerCollisionAdmin('patch', '/tenants/:id/status', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.updateTenantStatus);
registerCollisionAdmin('post', '/tenants/:id/emergency-lock', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.triggerEmergencyLock);
app.post('/admin/reconciliation/run-job', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), async (req, res) => {
    try {
        const targetDate = req.query.date || new Date().toISOString().split('T')[0];
        const dbStore = new DatabaseStore_1.DatabaseStore();
        const quasarConnector = new QuasarConnector_1.QuasarConnector(null, null);
        const investigationQueueService = new InvestigationQueueService_1.InvestigationQueueService(dbStore, console);
        const job = new NightlyReconciliationJob_1.NightlyReconciliationJob(quasarConnector, dbStore, investigationQueueService, console);
        await job.run(targetDate);
        return res.status(200).json({ success: true, message: `Reconciliation job triggered for date: ${targetDate}` });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Insights & Reporting Routes
app.get('/admin/retention/suggestion', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), retention_controller_1.RetentionController.getPersonalSuggestion);
app.get('/admin/retention/at-risk', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), retention_controller_1.RetentionController.getAtRiskUsers);
// Dashboard Routes
const dashboardRoles = ['super_admin', 'admin', 'operator', 'owner', 'platform_admin', 'tenant_admin', 'internal_staff', 'admin_ops', 'admin_finance', 'admin_treasury', 'admin_executive', 'admin_risk'];
registerApiPair('get', '/api/dashboard/overview', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(dashboardRoles), dashboard_controller_1.DashboardController.getOverview);
registerApiPair('get', '/api/dashboard/alerts', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(dashboardRoles), dashboard_controller_1.DashboardController.getAlerts);
registerApiPair('get', '/api/dashboard/governance', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(dashboardRoles), dashboard_controller_1.DashboardController.getGovernance);
registerApiPair('get', '/api/dashboard/analytics', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(dashboardRoles), dashboard_controller_1.DashboardController.getAnalytics);
// Admin Agent Onboarding routes
registerCollisionAdmin('post', '/agents/onboard', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.onboardAgent);
registerCollisionAdmin('get', '/agents', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.listAgents);
registerCollisionAdmin('get', '/agents/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.getAgent);
registerCollisionAdmin('patch', '/agents/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.updateAgentProfile);
registerCollisionAdmin('patch', '/agents/:id/status', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.updateAgentStatus);
registerCollisionAdmin('patch', '/agents/:id/kyc', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.updateKycStatus);
registerCollisionAdmin('get', '/agents/:id/commissions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_agent_controller_1.AdminAgentController.getCommissions);
registerCollisionAdmin('patch', '/agents/:id/commissions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_agent_controller_1.AdminAgentController.updateCommissions);
registerCollisionAdmin('post', '/agents/:id/message', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.messageAgent);
registerCollisionAdmin('post', '/agents/:id/message-tenants', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.messageTenants);
registerCollisionAdmin('post', '/agents/:id/resend-invite', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.resendInvite);
registerCollisionAdmin('post', '/agents/:id/logo', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.updateLogo);
registerCollisionAdmin('delete', '/agents/:id/logo', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), admin_agent_controller_1.AdminAgentController.deleteLogo);
registerCollisionAdmin('post', '/tenants/:id/reset-passwords', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.resetTenantPasswords);
// Quasar Connectivity & Integration Health
app.get('/api/admin/quasar/health', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), quasar_health_controller_1.QuasarHealthController.getHealthReport);
app.get('/api/admin/quasar/health/live', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), quasar_health_controller_1.QuasarHealthController.getLiveness);
app.get('/api/admin/quasar/integrations', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), quasar_health_controller_1.QuasarHealthController.listIntegrations);
app.put('/api/admin/quasar/integrations/:tenantId/webhook-secret', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'owner']), quasar_health_controller_1.QuasarHealthController.updateWebhookSigningSecret);
app.put('/api/admin/quasar/webhook-secret/global', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'owner']), quasar_health_controller_1.QuasarHealthController.updateGlobalWebhookSigningSecret);
app.get('/api/admin/quasar/webhook-secret/status', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'owner']), quasar_health_controller_1.QuasarHealthController.getWebhookSecretStatus);
app.put('/api/admin/quasar/admin-credentials', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), quasar_health_controller_1.QuasarHealthController.upsertAdminCredentials);
app.get('/api/admin/quasar/admin-credentials/status', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), quasar_health_controller_1.QuasarHealthController.getAdminCredentialsStatus);
app.post('/api/admin/quasar/admin-credentials/test', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), quasar_health_controller_1.QuasarHealthController.testAdminCredentials);
// ── QFS Financial Sandbox API (/api/v1/sandbox/*) ─────────────────────────────
const qfs_api_key_middleware_1 = require("./middleware/qfs-api-key.middleware");
const qfs_sandbox_controller_1 = require("./controllers/qfs-sandbox.controller");
const qfs_admin_controller_1 = require("./controllers/qfs-admin.controller");
const qfsRead = (0, qfs_api_key_middleware_1.qfsApiKeyAuth)(['sandbox:read']);
const qfsWrite = (0, qfs_api_key_middleware_1.qfsApiKeyAuth)(['sandbox:write']);
// Session
app.get('/api/v1/sandbox', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getSession);
// Bootstrap & Config
app.post('/api/v1/sandbox/bootstrap', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.bootstrap);
app.get('/api/v1/sandbox/config', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getConfig);
app.put('/api/v1/sandbox/config', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.updateConfig);
app.post('/api/v1/sandbox/config/generate-secret', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.generateSecret);
// Banks
app.get('/api/v1/sandbox/banks', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getBanks);
app.get('/api/v1/sandbox/bank-providers', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.listBankProviders);
app.get('/api/v1/sandbox/bank/lookup', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.lookupBank);
// Accounts (generate must come before :id routes)
app.post('/api/v1/sandbox/accounts/generate', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.generateAccount);
app.get('/api/v1/sandbox/accounts', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.listAccounts);
app.get('/api/v1/sandbox/accounts/:id', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getAccount);
app.post('/api/v1/sandbox/accounts/:id/credit', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.creditAccount);
app.post('/api/v1/sandbox/accounts/:id/debit', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.debitAccount);
app.get('/api/v1/sandbox/accounts/:id/ledger', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getLedger);
app.get('/api/v1/sandbox/accounts/:id/balance-snapshots', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getBalanceSnapshots);
// Audit
app.get('/api/v1/sandbox/audit-logs', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getAuditLogs);
// Timeline
app.get('/api/v1/sandbox/timeline', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getTimeline);
app.get('/api/v1/sandbox/timeline/:correlationId', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getTimelineByCorrelation);
// Profiles
app.get('/api/v1/sandbox/profiles', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getProfiles);
// Transfers (generate must come before :id routes)
app.post('/api/v1/sandbox/transfers/generate', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.generateTransfer);
app.post('/api/v1/sandbox/transfers', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.createTransfer);
app.get('/api/v1/sandbox/transfers', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.listTransfers);
app.get('/api/v1/sandbox/transfers/:id', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getTransfer);
app.post('/api/v1/sandbox/transfers/:id/approve', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.approveTransfer);
app.post('/api/v1/sandbox/transfers/:id/reject', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.rejectTransfer);
app.post('/api/v1/sandbox/transfers/:id/reverse', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.reverseTransfer);
// PSP Simulators
app.get('/api/v1/sandbox/providers', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getProviders);
app.get('/api/v1/sandbox/providers/:provider', qfsRead, qfs_sandbox_controller_1.QfsSandboxController.getProvider);
app.post('/api/v1/sandbox/providers/:provider/simulate', qfsWrite, qfs_sandbox_controller_1.QfsSandboxController.simulateProvider);
// ── QFS Admin Routes (admin JWT auth) ─────────────────────────────────────────
// API Key management — provision sk_test_* keys for tenants
app.post('/api/v1/admin/qfs/keys', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), qfs_admin_controller_1.QfsAdminController.createApiKey);
app.get('/api/v1/admin/qfs/keys', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), qfs_admin_controller_1.QfsAdminController.listApiKeys);
app.delete('/api/v1/admin/qfs/keys/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), qfs_admin_controller_1.QfsAdminController.revokeApiKey);
// Admin financial sandbox views
app.get('/api/v1/admin/financial-sandbox/webhooks', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), qfs_admin_controller_1.QfsAdminController.listWebhooks);
app.get('/api/v1/admin/financial-sandbox/webhooks/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), qfs_admin_controller_1.QfsAdminController.getWebhook);
app.post('/api/v1/admin/financial-sandbox/webhooks/:id/replay', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), qfs_admin_controller_1.QfsAdminController.replayWebhook);
app.get('/api/v1/admin/financial-sandbox/health', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), qfs_admin_controller_1.QfsAdminController.getHealth);
app.get('/api/v1/admin/financial-sandbox/analytics', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin']), qfs_admin_controller_1.QfsAdminController.getAnalytics);
// Terminal Management Endpoints
const tenant_kyc_controller_1 = require("./controllers/tenant-kyc.controller");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
app.post('/api/tenant/kyc/upload', auth_middleware_1.authenticate, upload.single('file'), tenant_kyc_controller_1.TenantKycController.uploadKyc);
app.get('/api/admin/kyc/documents', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'internal_staff']), tenant_kyc_controller_1.TenantKycController.listPending);
app.patch('/api/admin/kyc/documents/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'internal_staff']), tenant_kyc_controller_1.TenantKycController.reviewDocument);
const platformFeeAdminRoles = ['super_admin', 'admin_deploy'];
registerCollisionAdmin('get', '/platform-fees', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_profiles_controller_1.PlatformFeeProfilesController.list);
registerCollisionAdmin('get', '/platform-fees/agents', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_profiles_controller_1.PlatformFeeProfilesController.listAgents);
registerCollisionAdmin('get', '/platform-fees/agent-commission', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.agentCommission);
registerCollisionAdmin('get', '/platform-fees/assessments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_assessments_controller_1.PlatformFeeAssessmentsController.list);
registerCollisionAdmin('get', '/platform-fees/assessments/:assessmentId', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_assessments_controller_1.PlatformFeeAssessmentsController.get);
registerCollisionAdmin('get', '/platform-fees/reconciliation', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_assessments_controller_1.PlatformFeeAssessmentsController.reconciliation);
registerCollisionAdmin('get', '/platform-fees/distribution', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.distribution);
registerCollisionAdmin('get', '/platform-fees/stakeholders', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.listStakeholders);
registerCollisionAdmin('post', '/platform-fees/stakeholders', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.createStakeholder);
registerCollisionAdmin('get', '/platform-fees/stakeholders/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.getStakeholder);
registerCollisionAdmin('patch', '/platform-fees/stakeholders/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.updateStakeholder);
registerCollisionAdmin('get', '/platform-fees/stakeholders/:id/payables', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.listPayables);
registerCollisionAdmin('get', '/platform-fees/stakeholders/:id/settlements', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.listSettlements);
registerCollisionAdmin('get', '/platform-fees/withdrawals', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.listWithdrawals);
registerCollisionAdmin('post', '/platform-fees/withdrawals', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.createWithdrawal);
registerCollisionAdmin('get', '/platform-fees/withdrawals/:withdrawalId', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.getWithdrawal);
registerCollisionAdmin('post', '/platform-fees/withdrawals/:withdrawalId/approve', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.approveWithdrawal);
registerCollisionAdmin('post', '/platform-fees/withdrawals/:withdrawalId/reject', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_distribution_controller_1.PlatformFeeDistributionController.rejectWithdrawal);
registerCollisionAdmin('get', '/platform-fees/:transactionType', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_profiles_controller_1.PlatformFeeProfilesController.get);
registerCollisionAdmin('put', '/platform-fees/:transactionType/draft', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_profiles_controller_1.PlatformFeeProfilesController.saveDraft);
registerCollisionAdmin('post', '/platform-fees/:transactionType/propose', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_profiles_controller_1.PlatformFeeProfilesController.propose);
registerCollisionAdmin('post', '/platform-fees/:transactionType/reject', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), require_admin_mfa_middleware_1.requireCheckerMfa, platform_fee_profiles_controller_1.PlatformFeeProfilesController.reject);
registerCollisionAdmin('post', '/platform-fees/:transactionType/publish', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), require_admin_mfa_middleware_1.requireCheckerMfa, platform_fee_profiles_controller_1.PlatformFeeProfilesController.publish);
registerCollisionAdmin('post', '/platform-fees/:transactionType/preview', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), platform_fee_profiles_controller_1.PlatformFeeProfilesController.preview);
registerCollisionAdmin('get', '/agent-webhooks', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), agent_webhook_controller_1.AgentWebhookController.adminList);
registerCollisionAdmin('get', '/agent-webhooks/:agentId/deliveries', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), agent_webhook_controller_1.AgentWebhookController.adminDeliveries);
registerCollisionAdmin('post', '/agent-webhooks/:agentId/enable', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), agent_webhook_controller_1.AgentWebhookController.adminEnable);
registerCollisionAdmin('post', '/agent-webhooks/:agentId/disable', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(platformFeeAdminRoles), agent_webhook_controller_1.AgentWebhookController.adminDisable);
app.get('/api/tenant/:id/kyc', auth_middleware_1.authenticate, tenant_kyc_controller_1.TenantKycController.getKycDocuments);
const deviceLinkQrLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { success: false, error: 'Too many device-link requests. Please try again later.' },
});
app.post('/api/tenant/devices/link-qr', auth_middleware_1.authenticate, deviceLinkQrLimiter, onboarding_controller_1.OnboardingController.generateAuthenticatedDeviceLinkQr);
// Agent Portal Routes
app.post('/api/agent/register', agent_controller_1.AgentController.register);
app.post('/api/agent/login', agent_controller_1.AgentController.login);
app.post('/api/agent/change-password', agent_controller_1.AgentController.changePassword);
app.post('/api/agent/forgot-password', verificationLimiter, agent_controller_1.AgentController.forgotPassword);
app.post('/api/agent/reset-password', authLimiter, agent_controller_1.AgentController.resetPassword);
app.post('/api/agent/resolve-suspension', agent_controller_1.AgentController.resolveSuspension);
const bank_hmo_distribution_controller_1 = require("./modules/health-insurance/controllers/bank-hmo-distribution.controller");
app.get('/api/agent/dashboard', auth_middleware_1.authenticate, agent_controller_1.AgentController.getDashboard);
app.get('/api/agent/hmo-distribution/catalogue', auth_middleware_1.authenticate, bank_hmo_distribution_controller_1.BankHmoDistributionController.catalogue);
app.get('/api/agent/hmo-distribution/catalogue/:providerId', auth_middleware_1.authenticate, bank_hmo_distribution_controller_1.BankHmoDistributionController.provider);
app.get('/api/agent/hmo-distribution/facilities', auth_middleware_1.authenticate, bank_hmo_distribution_controller_1.BankHmoDistributionController.facilities);
app.get('/api/agent/hmo-distribution/offerings', auth_middleware_1.authenticate, bank_hmo_distribution_controller_1.BankHmoDistributionController.offerings);
app.post('/api/agent/hmo-distribution/offerings', auth_middleware_1.authenticate, bank_hmo_distribution_controller_1.BankHmoDistributionController.changeOffering);
app.post('/api/agent/hmo-distribution/selections', auth_middleware_1.authenticate, bank_hmo_distribution_controller_1.BankHmoDistributionController.validateSelection);
app.get('/api/agent/hmo-distribution/overview', auth_middleware_1.authenticate, bank_hmo_distribution_controller_1.BankHmoDistributionController.overview);
app.get('/api/agent/hmo-distribution/tenants', auth_middleware_1.authenticate, bank_hmo_distribution_controller_1.BankHmoDistributionController.tenants);
app.post('/api/agent/hardware/assign', auth_middleware_1.authenticate, agent_controller_1.AgentController.assignHardware);
app.post('/api/agent/hardware/sync', auth_middleware_1.authenticate, agent_controller_1.AgentController.syncHardware);
const product_catalog_controller_1 = require("./modules/product-catalog/product-catalog.controller");
app.get('/api/agent/catalog/products', auth_middleware_1.authenticate, (req, res) => product_catalog_controller_1.productCatalogController.getMasterProducts(req, res));
app.get('/api/agent/catalog/offers', auth_middleware_1.authenticate, (req, res) => product_catalog_controller_1.productCatalogController.getHmoOffers(req, res));
app.post('/api/agent/catalog/offers', auth_middleware_1.authenticate, (req, res) => product_catalog_controller_1.productCatalogController.configureOfferPrice(req, res));
app.get('/api/agent/catalog/assignments', auth_middleware_1.authenticate, (req, res) => product_catalog_controller_1.productCatalogController.listAssignments(req, res));
app.post('/api/agent/catalog/assignments', auth_middleware_1.authenticate, (req, res) => product_catalog_controller_1.productCatalogController.assignProduct(req, res));
app.delete('/api/agent/catalog/assignments/:id', auth_middleware_1.authenticate, (req, res) => product_catalog_controller_1.productCatalogController.revokeAssignment(req, res));
const activation_routes_1 = __importDefault(require("./routes/activation.routes"));
const auth_routes_1 = require("./routes/auth.routes");
const ecs_routes_1 = __importDefault(require("./routes/ecs.routes"));
const vault_routes_1 = __importDefault(require("./routes/vault.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const finance_routes_1 = __importDefault(require("./routes/finance.routes"));
const services_routes_1 = __importDefault(require("./routes/services.routes"));
const sync_routes_1 = __importDefault(require("./routes/sync.routes"));
const crm_routes_1 = __importDefault(require("./routes/crm.routes"));
const inventory_routes_1 = __importDefault(require("./routes/inventory.routes"));
const catalog_routes_1 = __importDefault(require("./routes/catalog.routes"));
const operations_routes_1 = __importDefault(require("./routes/operations.routes"));
const financial_platform_routes_1 = __importDefault(require("./routes/financial-platform.routes"));
const observability_routes_1 = __importDefault(require("./routes/observability.routes"));
app.use(activation_routes_1.default);
app.use('/auth', auth_routes_1.authRoutes);
app.use('/v1/ecs', ecs_routes_1.default);
app.use('/vault', vault_routes_1.default);
app.use('/api/vault', vault_routes_1.default);
app.use('/settings', settings_routes_1.default);
app.use('/api/v1/finance', auth_middleware_1.authenticate, finance_routes_1.default);
app.use('/api/v1/services', auth_middleware_1.authenticate, services_routes_1.default);
app.use('/api/services', auth_middleware_1.authenticate, services_routes_1.default);
app.use('/services', auth_middleware_1.authenticate, services_routes_1.default);
app.use('/api/v1/sync', sync_routes_1.default);
app.use('/api/v1/crm', auth_middleware_1.authenticate, crm_routes_1.default);
app.use('/api/inventory', auth_middleware_1.authenticate, inventory_routes_1.default);
app.use('/inventory', auth_middleware_1.authenticate, inventory_routes_1.default);
app.use('/api/v1/catalog', auth_middleware_1.authenticate, catalog_routes_1.default);
app.use('/v1/catalog', auth_middleware_1.authenticate, catalog_routes_1.default);
app.use('/api/v1', auth_middleware_1.authenticate, operations_routes_1.default);
app.use('/api/v1', financial_platform_routes_1.default);
app.use('/api/admin/observability', observability_routes_1.default);
app.use('/admin/observability', observability_routes_1.default);
// Orchestration Endpoints
app.get('/api/orchestration/context', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), orchestration_controller_1.OrchestrationController.getContext);
app.post('/api/orchestration/onboarding/provision', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), orchestration_controller_1.OrchestrationController.provisionOnboarding);
app.post('/api/orchestration/modules/enable', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), orchestration_controller_1.OrchestrationController.enableModule);
app.post('/api/orchestration/tiers/elevate', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), orchestration_controller_1.OrchestrationController.elevateTier);
// Runtime Engine
app.get('/api/v1/runtime/config', auth_middleware_1.authenticate, runtime_controller_1.RuntimeController.getConfig);
app.get('/v1/runtime/config', auth_middleware_1.authenticate, runtime_controller_1.RuntimeController.getConfig);
// Admin Operations
app.post('/api/admin/master-mode/enter', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'owner']), admin_controller_1.AdminController.enterMasterMode);
registerCollisionAdmin('get', '/dashboard-stats', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'owner']), admin_controller_1.AdminController.getDashboardStats);
app.get('/api/admin/audit-logs', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'owner', 'tenant_admin', 'finance_staff', 'staff']), audit_controller_1.AuditController.getSystemAuditLogs);
app.get('/admin/profile', auth_middleware_1.authenticate, admin_controller_1.AdminController.getProfile);
app.patch('/admin/profile', auth_middleware_1.authenticate, admin_controller_1.AdminController.updateProfile);
app.get('/api/admin/profile', auth_middleware_1.authenticate, admin_controller_1.AdminController.getProfile);
app.patch('/api/admin/profile', auth_middleware_1.authenticate, admin_controller_1.AdminController.updateProfile);
const fs_1 = __importDefault(require("fs"));
// Setup storage for local files
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        let destPath = 'uploads/other';
        if (file.fieldname === 'cac_document') {
            destPath = 'uploads/cac';
        }
        else if (file.fieldname === 'backup_file') {
            destPath = 'uploads/backups';
        }
        // Ensure dir exists
        const fullPath = path_1.default.join(__dirname, '..', destPath);
        if (!fs_1.default.existsSync(fullPath)) {
            fs_1.default.mkdirSync(fullPath, { recursive: true });
        }
        cb(null, fullPath);
    },
    filename: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
    }
});
const localUpload = (0, multer_1.default)({ storage: storage });
app.post('/api/admin/upload-cac', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'owner']), upload.single('cac_document'), admin_controller_1.AdminController.uploadCacDocument);
app.post('/api/admin/claude-backup', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'owner']), localUpload.single('backup_file'), admin_controller_1.AdminController.uploadClaudeBackup);
app.post('/api/admin/virtual-account/init', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'admin', 'owner']), admin_controller_1.AdminController.initVirtualAccountEngine);
const mfa_controller_1 = require("./controllers/mfa.controller");
const company_transfer_auth_controller_1 = require("./controllers/company-transfer-auth.controller");
app.post('/api/mfa/generate', auth_middleware_1.authenticate, mfa_controller_1.MfaController.generate);
app.post('/api/mfa/enable', auth_middleware_1.authenticate, mfa_controller_1.MfaController.enable);
// Cloud Metrics API Endpoints
const cloudMetricsController = new cloud_metrics_controller_1.CloudMetricsController();
app.get('/cloud-metrics/overview', auth_middleware_1.authenticate, cloudMetricsController.getOverview);
app.get('/cloud-metrics/sync-health', auth_middleware_1.authenticate, cloudMetricsController.getSyncHealth);
app.get('/cloud-metrics/terminals', auth_middleware_1.authenticate, cloudMetricsController.getTerminals);
app.get('/cloud-metrics/devices', auth_middleware_1.authenticate, cloudMetricsController.getDevices);
app.get('/cloud-metrics/backups', auth_middleware_1.authenticate, cloudMetricsController.getBackups);
app.get('/cloud-metrics/activity-feed', auth_middleware_1.authenticate, cloudMetricsController.getActivityFeed);
app.get('/cloud-metrics/alerts', auth_middleware_1.authenticate, cloudMetricsController.getAlerts);
app.get('/api/payout/platform-settings', auth_middleware_1.authenticate, admin_controller_1.AdminController.getPlatformPayoutSettingsPublic);
// Global Settings (Super Admin Only)
registerCollisionAdmin('get', '/settings', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.getGlobalSettings);
registerCollisionAdmin('patch', '/settings', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.updateGlobalSettings);
registerCollisionAdmin('get', '/settings/commissions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.getGlobalCommissions);
registerCollisionAdmin('patch', '/settings/commissions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.updateGlobalCommissions);
registerCollisionAdmin('post', '/broadcast', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.sendBroadcast);
// Quasar POS encryption key (card switch ICC crypto)
// /admin/* stays for local Vite proxy; /api/admin/* is required on staging nginx.
app.get('/admin/quasar/integrations', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.listQuasarIntegrations);
registerCollisionAdmin('get', '/quasar/pos-encryption-key/status', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.getQuasarPosEncryptionKeyStatus);
registerCollisionAdmin('post', '/quasar/pos-encryption-key/rotate', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.rotateQuasarPosEncryptionKey);
registerCollisionAdmin('post', '/quasar/pos-encryption-key/store', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.storeQuasarPosEncryptionKey);
registerCollisionAdmin('get', '/quasar/api-key/status', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.getQuasarApiKeyStatus);
registerCollisionAdmin('post', '/quasar/api-key/issue-live', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.issueQuasarLiveApiKey);
// Commission Command Center
registerCollisionAdmin('get', '/commissions/approvals', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.listApprovals);
registerCollisionAdmin('post', '/commissions/approvals/:id/approve', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), require_admin_mfa_middleware_1.requireCheckerMfa, commission_controller_1.CommissionController.approveCommission);
registerCollisionAdmin('post', '/commissions/approvals/:id/reject', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), require_admin_mfa_middleware_1.requireCheckerMfa, commission_controller_1.CommissionController.rejectCommission);
registerCollisionAdmin('post', '/commissions/clawback', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.executeClawback);
registerCollisionAdmin('get', '/commissions/audit', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.listAuditHistory);
registerCollisionAdmin('get', '/commissions/agents/progress', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.listAgentProgress);
registerCollisionAdmin('get', '/commissions/plans', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.listPlansAndTargets);
registerCollisionAdmin('get', '/commissions/budgets', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.listCampaignsAndBudgets);
registerCollisionAdmin('post', '/commissions/simulate', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.simulateCommission);
// Plans & Targets CRUD Endpoints
registerCollisionAdmin('post', '/commissions/programs', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.createProgram);
registerCollisionAdmin('put', '/commissions/programs/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.updateProgram);
registerCollisionAdmin('delete', '/commissions/programs/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.deleteProgram);
registerCollisionAdmin('post', '/commissions/programs/:id/versions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.createVersion);
registerCollisionAdmin('post', '/commissions/versions/:id/clone', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.cloneVersion);
registerCollisionAdmin('post', '/commissions/versions/:id/activate', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.activateVersion);
registerCollisionAdmin('put', '/commissions/versions/:id/rules', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.updateVersionRules);
registerCollisionAdmin('delete', '/commissions/versions/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.deleteVersion);
registerCollisionAdmin('post', '/commissions/category-rules', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.createCategoryRule);
registerCollisionAdmin('put', '/commissions/category-rules/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.updateCategoryRule);
registerCollisionAdmin('delete', '/commissions/category-rules/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.deleteCategoryRule);
registerCollisionAdmin('post', '/commissions/performance-rules', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.createPerformanceRule);
registerCollisionAdmin('put', '/commissions/performance-rules/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.updatePerformanceRule);
registerCollisionAdmin('delete', '/commissions/performance-rules/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.deletePerformanceRule);
registerCollisionAdmin('post', '/commissions/terminal-rules', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.createTerminalRule);
registerCollisionAdmin('put', '/commissions/terminal-rules/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.updateTerminalRule);
registerCollisionAdmin('delete', '/commissions/terminal-rules/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), commission_controller_1.CommissionController.deleteTerminalRule);
// Subscriptions
registerCollisionAdmin('post', '/subscriptions/extend', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), admin_controller_1.AdminController.extendSubscription);
app.get('/api/subscription/status', auth_middleware_1.authenticate, admin_controller_1.AdminController.getSubscriptionStatus);
// API Endpoints for Admin (Invify Pro App / Operator App)
// User Device Controls & Audit Archiving (Super Admin only)
registerCollisionAdmin('get', '/user-devices', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), user_controller_1.UserController.listDevices);
registerCollisionAdmin('post', '/user-devices/approve', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), user_controller_1.UserController.approveDevice);
registerCollisionAdmin('post', '/user-devices/block', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), user_controller_1.UserController.blockDevice);
registerCollisionAdmin('post', '/audit/archive', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), user_controller_1.UserController.triggerArchiving);
app.post('/admin/devices/:deviceId/upgrade-to-company', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), device_controller_1.DeviceController.upgradeToCompany);
// Device Activation Hub Endpoints
app.get('/devices', auth_middleware_1.authenticate, device_controller_1.DeviceController.getDevices);
app.get('/api/devices', auth_middleware_1.authenticate, device_controller_1.DeviceController.getDevices);
app.get('/api/devices/connected', auth_middleware_1.authenticate, device_controller_1.DeviceController.getConnectedPresence);
// Nginx staging `location /api/` strips `/api`; keep the stripped alias.
app.get('/devices/connected', auth_middleware_1.authenticate, device_controller_1.DeviceController.getConnectedPresence);
app.get('/devices/activations', auth_middleware_1.authenticate, device_controller_1.DeviceController.getActivations);
app.post('/devices/activations', auth_middleware_1.authenticate, device_controller_1.DeviceController.createActivation);
app.post('/devices/activations/:id/approve', auth_middleware_1.authenticate, device_controller_1.DeviceController.approveActivation);
app.post('/devices/activations/:id/reject', auth_middleware_1.authenticate, device_controller_1.DeviceController.rejectActivation);
app.post('/devices/activations/:id/resend-email', auth_middleware_1.authenticate, device_controller_1.DeviceController.resendActivationEmail);
app.post('/devices/validate', device_controller_1.DeviceController.validateCode);
app.post('/devices/onboard', auth_middleware_1.authenticate, device_controller_1.DeviceController.onboardDevice);
app.patch('/devices/:id', auth_middleware_1.authenticate, device_controller_1.DeviceController.updateDevice);
app.patch('/devices/activations/:code/reset', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), device_controller_1.DeviceController.resetActivation);
// Same-origin admin (app.invify.org) only proxies /api/* — keep /api aliases so
// activation generate/list do not hit the SPA host (HTTP 405).
app.get('/api/devices/activations', auth_middleware_1.authenticate, device_controller_1.DeviceController.getActivations);
app.post('/api/devices/activations', auth_middleware_1.authenticate, device_controller_1.DeviceController.createActivation);
app.post('/api/devices/activations/:id/approve', auth_middleware_1.authenticate, device_controller_1.DeviceController.approveActivation);
app.post('/api/devices/activations/:id/reject', auth_middleware_1.authenticate, device_controller_1.DeviceController.rejectActivation);
app.post('/api/devices/activations/:id/resend-email', auth_middleware_1.authenticate, device_controller_1.DeviceController.resendActivationEmail);
app.post('/api/devices/validate', device_controller_1.DeviceController.validateCode);
app.post('/api/devices/onboard', auth_middleware_1.authenticate, device_controller_1.DeviceController.onboardDevice);
app.patch('/api/devices/:id', auth_middleware_1.authenticate, device_controller_1.DeviceController.updateDevice);
app.patch('/api/devices/activations/:code/reset', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), device_controller_1.DeviceController.resetActivation);
// ─── DEVICE TELEMETRY & FLEET VISIBILITY ──────────────────────────────────────
app.get('/api/devices/:deviceId/status', auth_middleware_1.authenticate, device_controller_1.DeviceController.getDeviceStatus);
app.get('/api/devices/:deviceId/telemetry', auth_middleware_1.authenticate, device_controller_1.DeviceController.getDeviceTelemetry);
app.get('/api/devices/:deviceId/alerts', auth_middleware_1.authenticate, device_controller_1.DeviceController.getDeviceAlerts);
app.post('/api/devices/:deviceId/command', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_ops', 'manager']), device_controller_1.DeviceController.sendCommand);
app.post('/api/devices/:deviceId/commands', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_ops', 'manager']), device_controller_1.DeviceController.sendCommand);
app.get('/devices/:deviceId/status', auth_middleware_1.authenticate, device_controller_1.DeviceController.getDeviceStatus);
app.get('/devices/:deviceId/telemetry', auth_middleware_1.authenticate, device_controller_1.DeviceController.getDeviceTelemetry);
app.get('/devices/:deviceId/alerts', auth_middleware_1.authenticate, device_controller_1.DeviceController.getDeviceAlerts);
app.post('/devices/:deviceId/command', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_ops', 'manager']), device_controller_1.DeviceController.sendCommand);
app.post('/devices/:deviceId/commands', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_ops', 'manager']), device_controller_1.DeviceController.sendCommand);
// Terminal Sync (Public / Onboarding for mobile app)
app.post('/api/mobile/terminal/sync', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.mobileSync);
app.post('/api/mobile/terminal/keyexchange-success', terminal_controller_1.TerminalController.keyExchangeSuccess);
app.get('/api/mobile/terminal/status', terminal_controller_1.TerminalController.mobileStatus);
// Terminal Admin APIs (dual-register: nginx staging strips `/api`)
registerCollisionAdmin('get', '/terminals', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin']), terminal_controller_1.TerminalController.getTablets);
registerCollisionAdmin('post', '/terminals/import', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), terminal_controller_1.terminalUploadMiddleware, terminal_controller_1.TerminalController.importTerminals);
registerCollisionAdmin('get', '/terminals/assignments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin']), terminal_controller_1.TerminalController.getAssignments);
registerCollisionAdmin('post', '/terminals/assignments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), terminal_controller_1.TerminalController.assignHardware);
registerCollisionAdmin('get', '/terminals/audit', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), terminal_controller_1.TerminalController.getAuditLog);
registerCollisionAdmin('patch', '/terminals/:id/status', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), terminal_controller_1.TerminalController.updateTablet);
app.get('/admin/analytics', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), analytics_controller_1.AnalyticsController.getAdminAnalytics);
// Global AI Search
app.get('/api/search', auth_middleware_1.authenticate, search_controller_1.SearchController.performGlobalSearch);
/** --- FINANCIAL REVIEWS (SUPER ADMIN + TENANT ADMIN) --- **/
registerCollisionAdmin('get', '/tenants/:id/details', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, admin_controller_1.AdminController.getTenantDetails);
registerCollisionAdmin('post', '/tenants/:id/provision-va', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, admin_controller_1.AdminController.provisionVirtualAccount);
registerCollisionAdmin('post', '/tenants/:id/provision-virtual-account', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, admin_controller_1.AdminController.provisionVirtualAccount);
registerCollisionAdmin('post', '/tenants/:id/students/:studentId/provision-va', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, admin_controller_1.AdminController.provisionStudentVirtualAccount);
registerCollisionAdmin('post', '/tenants/:id/customers/:customerId/provision-va', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, admin_controller_1.AdminController.provisionCustomerVirtualAccount);
app.get('/admin/ledger', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'owner', 'tenant_admin']), admin_controller_1.AdminController.listLedger);
app.get('/api/admin/ledger', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'owner', 'tenant_admin']), admin_controller_1.AdminController.listLedger);
app.get('/admin/payments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'owner', 'tenant_admin']), admin_controller_1.AdminController.listPayments);
app.get('/api/admin/payments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'owner', 'tenant_admin']), admin_controller_1.AdminController.listPayments);
app.get('/api/admin/tenant-payables', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'admin_treasury', 'owner', 'tenant_admin']), admin_controller_1.AdminController.listTenantPayables);
app.get('/admin/tenant-payables', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'admin_treasury', 'owner', 'tenant_admin']), admin_controller_1.AdminController.listTenantPayables);
app.post('/api/admin/virtual-accounts/refresh', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'admin_treasury']), admin_controller_1.AdminController.refreshVirtualAccounts);
app.post('/admin/virtual-accounts/refresh', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'admin_treasury']), admin_controller_1.AdminController.refreshVirtualAccounts);
const paymentAlertRoles = ['super_admin', 'internal_staff', 'admin', 'admin_finance', 'admin_treasury'];
async function listPaymentAlerts(_req, res) {
    try {
        const { listPaymentAlerts } = await Promise.resolve().then(() => __importStar(require('./services/payment-alert-quasar-sync')));
        const rows = await listPaymentAlerts();
        return res.status(200).json({ rows });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to list payment alerts' });
    }
}
async function repushPaymentAlert(req, res) {
    try {
        const { repushPaymentAlert } = await Promise.resolve().then(() => __importStar(require('./services/payment-alert-quasar-sync')));
        const row = await repushPaymentAlert(String(req.params.id || ''));
        return res.status(200).json({ ok: true, alert: row });
    }
    catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Failed to repush payment alert' });
    }
}
app.get('/api/admin/payment-alerts', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...paymentAlertRoles]), listPaymentAlerts);
app.get('/admin/payment-alerts', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...paymentAlertRoles]), listPaymentAlerts);
app.post('/api/admin/payment-alerts/:id/repush', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...paymentAlertRoles]), repushPaymentAlert);
app.post('/admin/payment-alerts/:id/repush', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...paymentAlertRoles]), repushPaymentAlert);
app.get('/api/admin/virtual-accounts', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'admin_treasury', 'owner', 'tenant_admin']), admin_controller_1.AdminController.listVirtualAccounts);
app.get('/admin/virtual-accounts', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'admin_treasury', 'owner', 'tenant_admin']), admin_controller_1.AdminController.listVirtualAccounts);
app.get('/api/admin/virtual-accounts/:accountNumber/transactions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'admin_treasury', 'owner', 'tenant_admin']), admin_controller_1.AdminController.getVirtualAccountTransactions);
app.get('/admin/virtual-accounts/:accountNumber/transactions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin', 'admin_finance', 'admin_treasury', 'owner', 'tenant_admin']), admin_controller_1.AdminController.getVirtualAccountTransactions);
// Wallet Endpoints (Internal Ledger)
app.get('/api/v1/wallet', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, wallet_controller_1.WalletController.getBalance);
app.get('/api/v1/wallet/transactions', auth_middleware_1.authenticate, rbac_middleware_1.checkTenantAccess, wallet_controller_1.WalletController.getTransactions);
// Users Management
registerCollisionAdmin('get', '/users', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin']), user_controller_1.UserController.listUsers);
registerCollisionAdmin('post', '/users', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin']), user_controller_1.UserController.createUser);
registerCollisionAdmin('patch', '/users/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin']), user_controller_1.UserController.updateUser);
registerCollisionAdmin('post', '/users/:id/reset-mfa', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin']), user_controller_1.UserController.resetUserMfa);
registerCollisionAdmin('post', '/users/:id/reset-password', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin']), user_controller_1.UserController.resetStaffPassword);
app.post('/admin/invites', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['tenant_admin', 'owner', 'super_admin', 'admin']), invite_controller_1.InviteController.sendInvite);
app.post('/api/admin/invites', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['tenant_admin', 'owner', 'super_admin', 'admin']), invite_controller_1.InviteController.sendInvite);
registerCollisionAdmin('get', '/maker-checker', auth_middleware_1.authenticate, maker_checker_controller_1.MakerCheckerController.list);
registerCollisionAdmin('post', '/maker-checker/:id/approve', auth_middleware_1.authenticate, maker_checker_controller_1.MakerCheckerController.approve);
registerCollisionAdmin('post', '/maker-checker/:id/reject', auth_middleware_1.authenticate, maker_checker_controller_1.MakerCheckerController.reject);
// Curriculum System
app.get('/admin/curriculum', auth_middleware_1.authenticate, curriculum_controller_1.CurriculumController.listCurriculum);
app.post('/admin/curriculum', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), curriculum_controller_1.CurriculumController.createTopic);
app.patch('/admin/curriculum/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), curriculum_controller_1.CurriculumController.updateTopic);
app.delete('/admin/curriculum/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), curriculum_controller_1.CurriculumController.deleteTopic);
// Collaborative Notes Repository
app.get('/admin/notes', auth_middleware_1.authenticate, admin_controller_1.AdminController.listNotes);
app.post('/admin/notes', auth_middleware_1.authenticate, admin_controller_1.AdminController.saveNote);
app.get('/admin/notes/:id/export', auth_middleware_1.authenticate, admin_controller_1.AdminController.exportNotePdf);
// Billing & Subscriptions
app.get('/billing/status', auth_middleware_1.authenticate, billing_controller_1.BillingController.getStatus);
app.post('/billing/subscribe', auth_middleware_1.authenticate, billing_controller_1.BillingController.subscribe);
// Referral System
app.get('/referrals/stats', auth_middleware_1.authenticate, referral_controller_1.ReferralController.getStats);
app.post('/referrals/send', auth_middleware_1.authenticate, referral_controller_1.ReferralController.sendInvite);
// Attendance System
const registerAttendanceRoute = (method, path, ...handlers) => {
    app[method](path, ...handlers);
    app[method](`/api${path}`, ...handlers);
};
registerAttendanceRoute('get', '/attendance/students', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.listStudents);
registerAttendanceRoute('post', '/attendance/enroll', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.enroll);
registerAttendanceRoute('get', '/attendance/settings', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.getSettings);
registerAttendanceRoute('put', '/attendance/settings', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.updateSettings);
registerAttendanceRoute('get', '/attendance/calendar', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.listCalendarExceptions);
registerAttendanceRoute('post', '/attendance/calendar', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.addCalendarException);
registerAttendanceRoute('delete', '/attendance/calendar/:id', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.deleteCalendarException);
registerAttendanceRoute('get', '/attendance/assignments', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.listAssignments);
registerAttendanceRoute('post', '/attendance/assignments', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.createAssignment);
registerAttendanceRoute('delete', '/attendance/assignments/:id', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.deleteAssignment);
registerAttendanceRoute('get', '/attendance/register', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.getRegister);
registerAttendanceRoute('post', '/attendance/save', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.saveRegister);
registerAttendanceRoute('post', '/attendance/bulk-present', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.bulkPresent);
registerAttendanceRoute('post', '/attendance/correct', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.correctEntry);
registerAttendanceRoute('get', '/attendance/report', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.getClassReport);
registerAttendanceRoute('get', '/attendance/report/pdf', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.exportClassReportPdf);
registerAttendanceRoute('get', '/attendance/register/pdf', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.exportRegisterPdf);
registerAttendanceRoute('get', '/attendance/student-history/:studentId', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.getStudentHistory);
registerAttendanceRoute('get', '/attendance/history', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.getHistory);
registerAttendanceRoute('get', '/attendance/audit-log', auth_middleware_1.authenticate, attendance_controller_1.AttendanceController.getAuditLog);
(0, school_card_routes_1.registerSchoolCardRoutes)(app, auth_middleware_1.authenticate, (0, school_card_routes_1.createUnappliedSchoolCardService)());
// Class Insights
app.get('/insights/class', auth_middleware_1.authenticate, insights_controller_1.InsightsController.getClassInsights);
// Retention & Churn Prevention
app.post('/admin/retention/process', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), retention_controller_1.RetentionController.processRetention);
app.get('/admin/retention/at-risk', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin']), retention_controller_1.RetentionController.getAtRiskUsers);
app.get('/admin/retention/suggestion', auth_middleware_1.authenticate, retention_controller_1.RetentionController.getPersonalSuggestion);
// Webhooks (Secret Verification handled internally)
// Staging nginx `location /api/` strips `/api`, so public URL is
// https://staging.invify.org/api/webhooks/quasar → Node /webhooks/quasar.
app.post('/webhooks/quasar', webhook_controller_1.WebhookController.handleQuasarWebhook);
app.post('/api/webhooks/quasar', webhook_controller_1.WebhookController.handleQuasarWebhook);
app.post('/webhooks/paystack', webhook_controller_1.WebhookController.handlePaystackWebhook);
app.post('/webhooks/flutterwave', webhook_controller_1.WebhookController.handleFlutterwaveWebhook);
app.post('/webhooks/stripe', webhook_controller_1.WebhookController.handleStripeWebhook);
app.get('/webhooks/whatsapp', whatsapp_webhook_controller_1.WhatsAppWebhookController.verify);
app.post('/webhooks/whatsapp', whatsapp_webhook_controller_1.WhatsAppWebhookController.handle);
// Reconciliation Endpoints
app.get('/api/reconciliation', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.view'), reconciliation_controller_1.ReconciliationController.getReport);
// Reconciliation detail tabs
app.get('/api/reconciliation/:id/details', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.view'), reconciliation_controller_1.ReconciliationController.getDetails);
app.get('/api/reconciliation/:id/ledger', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.view'), reconciliation_controller_1.ReconciliationController.getLedger);
app.get('/api/reconciliation/:id/settlement', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.view'), reconciliation_controller_1.ReconciliationController.getSettlement);
app.get('/api/reconciliation/:id/wallet', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.view'), reconciliation_controller_1.ReconciliationController.getWallet);
app.get('/api/reconciliation/:id/card', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.view'), reconciliation_controller_1.ReconciliationController.getCard);
app.get('/api/reconciliation/:id/bank', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.view'), reconciliation_controller_1.ReconciliationController.getBank);
app.get('/api/reconciliation/:id/audit', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.audit.view'), reconciliation_controller_1.ReconciliationController.getAudit);
app.get('/api/reconciliation/:id/timeline', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.timeline.view'), reconciliation_controller_1.ReconciliationController.getTimeline);
// Reconciliation Commands
app.post('/api/reconciliation/:id/assign', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.assign'), reconciliation_controller_1.ReconciliationController.assign);
app.post('/api/reconciliation/:id/escalate', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.escalate'), reconciliation_controller_1.ReconciliationController.escalate);
app.post('/api/reconciliation/:id/resolve', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.resolve'), reconciliation_controller_1.ReconciliationController.resolve);
app.post('/api/reconciliation/:id/force_match', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.force_match'), reconciliation_controller_1.ReconciliationController.forceMatch);
app.post('/api/reconciliation/:id/retry', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.retry'), reconciliation_controller_1.ReconciliationController.retry);
app.post('/api/reconciliation/:id/lock', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.lock'), reconciliation_controller_1.ReconciliationController.lock);
app.post('/api/reconciliation/:id/unlock', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkTenantPermission)('reconciliation.unlock'), reconciliation_controller_1.ReconciliationController.unlock);
// Payout Configuration
app.get('/api/payout/settings', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury', 'finance_staff', 'staff']), rbac_middleware_1.checkTenantAccess, payout_controller_1.PayoutController.getSettings);
app.post('/api/payout/settings', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury']), rbac_middleware_1.checkTenantAccess, require_admin_mfa_middleware_1.requireAdminMfa, payout_controller_1.PayoutController.saveSettings);
app.post('/api/payout/quote', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_treasury']), rbac_middleware_1.checkTenantAccess, payout_controller_1.PayoutController.quote);
app.post('/api/payout/withdraw', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_treasury']), rbac_middleware_1.checkTenantAccess, require_admin_mfa_middleware_1.requireAdminMfa, payout_controller_1.PayoutController.withdraw);
app.get('/api/payout/history', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury', 'finance_staff']), rbac_middleware_1.checkTenantAccess, payout_controller_1.PayoutController.getHistory);
app.get('/api/payout/banks', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury', 'finance_staff', 'staff']), rbac_middleware_1.checkTenantAccess, payout_controller_1.PayoutController.getBanks);
app.post('/api/payout/resolve-account', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'tenant_admin', 'admin', 'admin_finance', 'admin_treasury']), rbac_middleware_1.checkTenantAccess, payout_controller_1.PayoutController.resolveAccount);
// Executive Dashboard
app.get('/api/finance/executive-summary', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), finance_controller_1.ExecutiveFinanceController.getSummary);
app.get('/api/finance/school-dashboard', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), finance_controller_1.ExecutiveFinanceController.getSchoolDashboard);
app.post('/api/finance/withdrawable/sync', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), async (req, res) => {
    try {
        const { resolveAuthoritativeTenantId } = await Promise.resolve().then(() => __importStar(require('./utils/finance-tenant')));
        const tenantId = resolveAuthoritativeTenantId(req);
        if (!tenantId)
            return res.status(401).json({ error: 'Tenant context missing' });
        const { QuasarWithdrawableService } = await Promise.resolve().then(() => __importStar(require('./services/quasar-withdrawable.service')));
        const credits = Array.isArray(req.body?.credits) ? req.body.credits : [];
        const available = await QuasarWithdrawableService.sync(String(tenantId), credits);
        return res.status(200).json({ ok: true, withdrawable: available });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to sync withdrawable funds' });
    }
});
app.get('/api/finance/daily-revenue', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), finance_controller_1.ExecutiveFinanceController.getDailyRevenue);
app.get('/api/finance/transactions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), finance_controller_1.ExecutiveFinanceController.getSchoolTransactions);
app.get('/api/finance/student/:studentId/summary', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), finance_controller_1.ExecutiveFinanceController.getStudentSummary);
app.get('/api/finance/student/:studentId/transactions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), finance_controller_1.ExecutiveFinanceController.getStudentTransactions);
app.get('/api/finance/quasar-transactions', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin']), finance_controller_1.ExecutiveFinanceController.getQuasarTransactions);
app.get('/api/finance/missed-payments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), finance_controller_1.ExecutiveFinanceController.getMissedPayments);
app.get('/api/finance/audit/ledger', auth_middleware_1.authenticate, audit_controller_1.AuditController.getTransactionLedger);
const financeDisputeRoles = [
    'super_admin',
    'admin',
    'admin_finance',
    'admin_treasury',
    'admin_risk',
    'finance_staff',
];
registerCollisionAdmin('get', '/finance/disputes', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...financeDisputeRoles]), financial_dispute_controller_1.FinancialDisputeController.list);
registerCollisionAdmin('post', '/finance/disputes', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...financeDisputeRoles]), financial_dispute_controller_1.FinancialDisputeController.create);
registerCollisionAdmin('get', '/finance/disputes/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...financeDisputeRoles]), financial_dispute_controller_1.FinancialDisputeController.get);
registerCollisionAdmin('get', '/finance/disputes/:id/audit', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...financeDisputeRoles]), financial_dispute_controller_1.FinancialDisputeController.audit);
registerCollisionAdmin('post', '/finance/disputes/:id/approve', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...financeDisputeRoles]), require_admin_mfa_middleware_1.requireCheckerMfa, financial_dispute_controller_1.FinancialDisputeController.approve);
registerCollisionAdmin('post', '/finance/disputes/:id/reject', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)([...financeDisputeRoles]), require_admin_mfa_middleware_1.requireCheckerMfa, financial_dispute_controller_1.FinancialDisputeController.reject);
// Card settlement reconciliation (processor file upload → mark Quasar pull settled)
const card_settlement_controller_1 = require("./controllers/card-settlement.controller");
app.get('/api/admin/finance/card-settlement/templates', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin', 'finance_staff']), card_settlement_controller_1.CardSettlementController.listTemplates);
app.get('/api/admin/finance/card-settlement/batches', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin', 'finance_staff']), card_settlement_controller_1.CardSettlementController.listBatches);
app.get('/api/admin/finance/card-settlement/batches/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin', 'finance_staff']), card_settlement_controller_1.CardSettlementController.getBatch);
app.post('/api/admin/finance/card-settlement/upload', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin']), require_admin_mfa_middleware_1.requireAdminMfa, card_settlement_controller_1.cardSettlementUploadMiddleware, card_settlement_controller_1.CardSettlementController.uploadSettlementFile);
// POS Operations (Medusa | Cpoint-Kimono | NIBSS)
app.post('/api/pos/transaction', auth_middleware_1.authenticate, pos_controller_1.PosController.processTransaction);
app.post('/api/pos/transactionFromMpos', auth_middleware_1.authenticate, pos_controller_1.PosController.processTransaction);
app.post('/api/v1/pos/transactionFromMpos', auth_middleware_1.authenticate, pos_controller_1.PosController.processTransaction);
app.get('/api/pos/history', auth_middleware_1.authenticate, pos_controller_1.PosController.getTransactionHistory);
app.post('/api/pos/test-iso', auth_middleware_1.authenticate, pos_controller_1.PosController.testIso); // ISO8583 debug parser
registerCollisionAdmin('get', '/pos/routing', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin']), pos_controller_1.PosController.getRoutingConfig);
registerCollisionAdmin('post', '/pos/routing', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin']), pos_controller_1.PosController.updateRoutingConfig);
registerCollisionAdmin('get', '/pos/routing/affected-devices', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin']), pos_controller_1.PosController.getAffectedDevices);
registerCollisionAdmin('post', '/pos/kimono-params/refresh', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin']), pos_controller_1.PosController.refreshKimonoParams);
registerCollisionAdmin('get', '/pos/observability', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin']), pos_controller_1.PosController.getObservabilityMetrics);
registerCollisionAdmin('post', '/pos/simulate', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'owner', 'admin']), pos_controller_1.PosController.simulateRoute);
// Terminal & Inventory Management Operations (dual-register: nginx staging strips `/api`)
registerCollisionAdmin('get', '/inventory/stats', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.getStats);
registerCollisionAdmin('get', '/inventory/tablets', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.getTablets);
registerCollisionAdmin('patch', '/inventory/tablets/:id', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.updateTablet);
registerCollisionAdmin('get', '/inventory/mpos', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.getMpos);
registerCollisionAdmin('patch', '/inventory/mpos/:id', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.updateMpos);
registerCollisionAdmin('get', '/inventory/printers', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.getPrinters);
registerCollisionAdmin('patch', '/inventory/printers/:id', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.updatePrinter);
registerCollisionAdmin('get', '/inventory/tids', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.getTids);
registerCollisionAdmin('patch', '/inventory/tids/:id', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.updateTid);
registerCollisionAdmin('post', '/inventory/upload', auth_middleware_1.authenticate, terminal_controller_1.terminalUploadMiddleware, terminal_controller_1.TerminalController.importTerminals);
registerCollisionAdmin('post', '/inventory/assign', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.assignHardware);
registerCollisionAdmin('get', '/inventory/assignments', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.getAssignments);
registerCollisionAdmin('post', '/inventory/assignments/:id/unassign', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.unassignHardware);
registerCollisionAdmin('get', '/inventory/audit', auth_middleware_1.authenticate, terminal_controller_1.TerminalController.getAuditLog);
// ─── APK Fleet Deployment ────────────────────────────────────────────────
const apk_controller_1 = require("./controllers/apk.controller");
app.get('/api/admin/apk', auth_middleware_1.authenticate, apk_controller_1.ApkController.getVault);
app.post('/api/admin/apk/upload', auth_middleware_1.authenticate, apk_controller_1.apkUploadMiddleware, apk_controller_1.ApkController.uploadApk);
app.post('/api/admin/apk/deploy', auth_middleware_1.authenticate, apk_controller_1.ApkController.deployApk);
app.post('/api/admin/apk/uninstall', auth_middleware_1.authenticate, apk_controller_1.ApkController.uninstallApk);
app.delete('/api/admin/apk/:id', auth_middleware_1.authenticate, apk_controller_1.ApkController.removeApk);
app.patch('/api/admin/apk/:id/url', auth_middleware_1.authenticate, apk_controller_1.ApkController.updateApkUrl);
app.get('/api/apk/:id/download', apk_controller_1.ApkController.downloadApk);
// Nginx staging `location /api/` strips the `/api` prefix; keep stripped aliases.
app.get('/admin/apk', auth_middleware_1.authenticate, apk_controller_1.ApkController.getVault);
app.post('/admin/apk/upload', auth_middleware_1.authenticate, apk_controller_1.apkUploadMiddleware, apk_controller_1.ApkController.uploadApk);
app.post('/admin/apk/deploy', auth_middleware_1.authenticate, apk_controller_1.ApkController.deployApk);
app.post('/admin/apk/uninstall', auth_middleware_1.authenticate, apk_controller_1.ApkController.uninstallApk);
app.delete('/admin/apk/:id', auth_middleware_1.authenticate, apk_controller_1.ApkController.removeApk);
app.patch('/admin/apk/:id/url', auth_middleware_1.authenticate, apk_controller_1.ApkController.updateApkUrl);
app.get('/apk/:id/download', apk_controller_1.ApkController.downloadApk);
// Defaulters System
app.get('/api/finance/defaulters', auth_middleware_1.authenticate, defaulters_controller_1.DefaultersController.getDefaulters);
app.post('/api/finance/defaulters/remind', auth_middleware_1.authenticate, defaulters_controller_1.DefaultersController.sendReminder);
// Financial Integrity
app.get('/api/finance/integrity/student-balances', auth_middleware_1.authenticate, integrity_controller_1.IntegrityController.validateStudentBalances);
app.post('/api/finance/integrity/recompute', auth_middleware_1.authenticate, integrity_controller_1.IntegrityController.recomputeBalances);
// Notifications Center
app.get('/api/notifications', auth_middleware_1.authenticate, notification_controller_1.NotificationController.getNotifications);
app.post('/api/notifications/:id/read', auth_middleware_1.authenticate, notification_controller_1.NotificationController.markAsRead);
app.post('/api/notifications/read-all', auth_middleware_1.authenticate, notification_controller_1.NotificationController.markAllAsRead);
app.get('/api/notifications/preferences', auth_middleware_1.authenticate, notification_controller_1.NotificationController.getPreferences);
app.put('/api/notifications/preferences', auth_middleware_1.authenticate, notification_controller_1.NotificationController.savePreferences);
// Compat aliases used by admin NotificationEngine (historical /api/v1 path)
app.get('/api/v1/notifications', auth_middleware_1.authenticate, notification_controller_1.NotificationController.getNotifications);
app.post('/api/v1/notifications/:id/read', auth_middleware_1.authenticate, notification_controller_1.NotificationController.markAsRead);
app.post('/api/v1/notifications/read-all', auth_middleware_1.authenticate, notification_controller_1.NotificationController.markAllAsRead);
app.get('/api/v1/notifications/preferences', auth_middleware_1.authenticate, notification_controller_1.NotificationController.getPreferences);
app.put('/api/v1/notifications/preferences', auth_middleware_1.authenticate, notification_controller_1.NotificationController.savePreferences);
// Student & Finance Core
app.get('/api/finance/virtual-account/:studentId', auth_middleware_1.authenticate, student_controller_1.StudentController.getVirtualAccount);
app.post('/api/finance/student-virtual-account/:studentId', auth_middleware_1.authenticate, student_controller_1.StudentController.provisionStudentVirtualAccount);
app.post('/api/finance/customer-virtual-account/:customerId', auth_middleware_1.authenticate, customer_controller_1.CustomerController.getVirtualAccount);
app.post('/api/finance/staff-virtual-account/:userId', auth_middleware_1.authenticate, customer_controller_1.CustomerController.getStaffVirtualAccount);
app.post('/api/finance/company-transfer/authorize', auth_middleware_1.authenticate, company_transfer_auth_controller_1.CompanyTransferAuthController.authorize);
app.get('/api/finance/virtual-accounts', auth_middleware_1.authenticate, customer_controller_1.CustomerController.listTenantVirtualAccounts);
app.get('/api/finance/virtual-accounts/:accountNumber/transactions', auth_middleware_1.authenticate, customer_controller_1.CustomerController.getVirtualAccountTransactions);
app.post('/api/finance/virtual-accounts/:accountNumber/sweep', auth_middleware_1.authenticate, customer_controller_1.CustomerController.sweepVirtualAccountFunds);
// School-mode Web Sync (students, academics, teachers, results)
app.post('/api/school/bulk-sync', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), school_sync_controller_1.SchoolSyncController.bulkSync);
app.get('/api/school/roster', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), school_sync_controller_1.SchoolSyncController.getRoster);
app.get('/api/school/billing', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), school_sync_controller_1.SchoolSyncController.getBilling);
// School payments + disputes (device Cash/POS → tenant admin web)
app.post('/api/school/payments/sync', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), school_payments_controller_1.SchoolPaymentsController.syncPayments);
app.get('/api/school/payments', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), school_payments_controller_1.SchoolPaymentsController.listPayments);
app.post('/api/school/payment-disputes', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), school_payments_controller_1.SchoolPaymentsController.raiseDispute);
app.get('/api/school/payment-disputes', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), school_payments_controller_1.SchoolPaymentsController.listDisputes);
app.patch('/api/school/payment-disputes/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), school_payments_controller_1.SchoolPaymentsController.updateDispute);
// Class term bills → individual parent emails + downloadable PDF
app.post('/api/school/term-bills/email', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), term_bills_controller_1.TermBillsController.emailClassBills);
app.post('/api/school/term-bills/pdf', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), term_bills_controller_1.TermBillsController.downloadPdf);
app.get('/api/school/parent-broadcast/audience', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin']), parent_broadcast_controller_1.ParentBroadcastController.audience);
app.post('/api/school/parent-broadcast', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin']), parent_broadcast_controller_1.ParentBroadcastController.send);
// POS staff roster + personal salary bank (Flutter Web Sync → tenant admin)
app.post('/api/staff/bulk-sync', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), staff_controller_1.StaffController.bulkSync);
app.post('/api/staff', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin', 'finance_staff']), staff_controller_1.StaffController.create);
app.get('/api/staff', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin', 'staff', 'cashier', 'finance_staff']), staff_controller_1.StaffController.list);
app.patch('/api/staff/:id', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin', 'finance_staff']), staff_controller_1.StaffController.patch);
app.post('/api/staff/:id/pay-salary', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'owner', 'admin', 'finance_staff']), staff_controller_1.StaffController.paySalary);
// CRM Routes
app.get('/api/v1/crm/customers', auth_middleware_1.authenticate, customer_controller_1.CustomerController.searchCustomers);
app.get('/api/v1/crm/customers/:id', auth_middleware_1.authenticate, customer_controller_1.CustomerController.getCustomerSummary);
app.post('/api/v1/crm/customers', auth_middleware_1.authenticate, customer_controller_1.CustomerController.createCustomer);
app.put('/api/v1/crm/customers/:id', auth_middleware_1.authenticate, customer_controller_1.CustomerController.updateCustomer);
// ─── GOVERNANCE AUDIT LEDGER ROUTES ────────────────────────────────────────
// GET /api/admin/audit/ledger  ─  Unified multi-source audit ledger
app.get('/api/admin/audit/ledger', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff']), async (req, res) => {
    try {
        // Platform operators see all activity unless they explicitly filter by tenant/target
        const explicitTenant = req.query.tenantId ||
            req.query.target ||
            req.headers['x-tenant-id'] ||
            undefined;
        const query = { ...req.query, tenantId: explicitTenant };
        const result = await gov_audit_service_1.GovAuditService.getLedger(query);
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// POST /api/admin/audit/log  ─  Write a governance/maker-checker audit entry
app.post('/api/admin/audit/log', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
        const user = req.user || {};
        await gov_audit_service_1.GovAuditService.logAction({
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
            tenant_id: req.body.tenant_id || req.body.tenantId || null,
            metadata: req.body.metadata || {}
        });
        res.json({ success: true, message: 'Audit entry logged.' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// ─── SUPPORT & COMPLAINTS ROUTES ─────────────────────────────────────────────
app.post('/api/mobile/complaints', support_controller_1.SupportController.createComplaint);
app.get('/api/mobile/complaints', support_controller_1.SupportController.getMobileComplaints);
registerCollisionAdmin('get', '/complaints', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin_ops', 'admin', 'support']), support_controller_1.SupportController.listComplaints);
registerCollisionAdmin('patch', '/complaints/:id/status', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff', 'admin_ops', 'admin', 'support']), support_controller_1.SupportController.updateComplaintStatus);
// ─── EMERGENCY APPLOCK ─────────────────────────────────────────────
app.post('/api/admin/emergency-lock', auth_middleware_1.authenticate, (0, rbac_middleware_1.checkRole)(['super_admin', 'internal_staff']), async (req, res) => {
    try {
        const { tenant_id, passcode } = req.body;
        if (!tenant_id || !passcode) {
            return res.status(400).json({ success: false, message: 'Missing tenant_id or passcode' });
        }
        // Supabase update — sole persistence path (P0-5A: removed JSON fallback)
        const { supabase: sb } = require('./db/supabase');
        await sb.from('tenants').update({ emergency_lock_code: passcode, is_emergency_locked: true }).eq('id', tenant_id);
        try {
            const user = req.user || {};
            const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
            await gov_audit_service_1.GovAuditService.logAction({
                id: require('crypto').randomUUID(),
                timestamp: new Date().toISOString(),
                module: 'GOVERNANCE',
                action: 'EMERGENCY_LOCK',
                user_email: user.email || 'unknown',
                user_name: user.name || user.email?.split('@')[0] || 'Admin',
                ip_address: ip,
                target: tenant_id,
                status: 'success',
                tenant_id,
                metadata: { passcode_set: true, source: 'admin_emergency_lock' }
            });
        }
        catch (auditErr) {
            console.warn('[EmergencyLock] audit log failed:', auditErr);
        }
        process.nextTick(() => {
            exports.io.to(`tenant:${tenant_id}`).emit('emergency_lock', { action: 'lock', passcode });
        });
        return res.json({ success: true, message: 'Emergency lock signal broadcasted' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
(0, register_routes_1.attachTenantBillingRoutes)(app);
(0, register_routes_2.attachHealthInsuranceRoutes)(app);
// 3. 404 HANDLER
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: 'This section could not be loaded. Please refresh and try again.',
    });
});
// 4. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
    console.error(`[Global Error] [${req.correlationId || 'NO-CORRELATION'}]`, err.stack);
    const status = err.status || 500;
    let code = err.code || 'ERR_INTERNAL_SERVER';
    if (status === 400)
        code = 'ERR_BAD_REQUEST';
    if (status === 401)
        code = 'ERR_UNAUTHORIZED';
    if (status === 403)
        code = 'ERR_FORBIDDEN';
    if (status === 404)
        code = 'ERR_NOT_FOUND';
    if (status === 422)
        code = 'ERR_UNPROCESSABLE_ENTITY';
    if (status === 429)
        code = 'ERR_TOO_MANY_REQUESTS';
    if (err?.name === 'MulterError' || err?.code === 'LIMIT_FILE_SIZE') {
        const uploadStatus = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(uploadStatus).json({
            success: false,
            code: uploadStatus === 413 ? 'ERR_PAYLOAD_TOO_LARGE' : 'ERR_BAD_REQUEST',
            error: err.message || 'Upload failed',
            message: err.message || 'Upload failed',
            correlationId: req.correlationId,
        });
    }
    res.status(status).json({
        success: false,
        code,
        message: err.message || 'Internal Server Error',
        correlationId: req.correlationId,
        details: err.details || {}
    });
});
// 5. START SERVER
const server = http.createServer(app);
// APK vault uploads (~100MB+) plus Contabo PUT can exceed Node's 5-minute default.
server.requestTimeout = 15 * 60 * 1000;
server.timeout = 15 * 60 * 1000;
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isCorsOriginAllowed(origin)) {
                callback(null, true);
            }
            else {
                callback(null, false);
            }
        },
        methods: ['GET', 'POST'],
        credentials: true
    },
    // Honor X-Forwarded-For from nginx so device IP is the tablet, not 127.0.0.1.
    // Engine.IO supports this; @types/socket.io omits it.
    proxy: true,
    transports: ['polling', 'websocket'],
    allowUpgrades: false,
    allowEIO3: true,
    pingInterval: 25000,
    pingTimeout: 60000,
    connectTimeout: 45000,
});
exports.io.use(async (socket, next) => {
    try {
        const { isMockTokenAllowed, isMockAuthAllowed, isPrivateLanIp } = require('./config/constants');
        const { BuildVariantService } = require('./config/build-variant');
        const { verifySupabaseAccessToken, verifyWithSharedSecrets, peekAlg, supabaseProjectUrl } = require('./utils/supabase-jwt');
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        // LOCAL mock socket auth. Also allowed from a private LAN IP when this
        // process is not production (npm run dev:staging on a PC still needs it).
        if (token === 'mock-super-admin') {
            const lanMock = process.env.NODE_ENV !== 'production' &&
                process.env.APP_ENV !== 'production' &&
                isPrivateLanIp(socketClientIp(socket));
            if (!isMockTokenAllowed() && !lanMock) {
                return next(new Error('Authentication error: mock tokens are not allowed in this environment'));
            }
            const tenantId = socket.handshake.auth?.tenantId ||
                socket.handshake.query?.tenantId ||
                null;
            console.warn(`[Socket.io] LOCAL mock-super-admin socket bypass. tenantId=${tenantId}`);
            socket.data.user = { id: 'mock-super-admin', role: 'super_admin', tenant_id: tenantId };
            socket.data.tenantId = tenantId;
            return next();
        }
        // Reject unsigned legacy offline tokens everywhere (including LOCAL — use signed JWT_SECRET tokens)
        if (token && String(token).includes('local_dev_signature')) {
            return next(new Error('Authentication error: unsigned offline tokens are no longer accepted'));
        }
        if (!token) {
            return next(new Error('Authentication error: Missing token'));
        }
        const variant = BuildVariantService.getInstance();
        const requiresVerify = variant.isStaging() ||
            variant.isProd() ||
            process.env.NODE_ENV === 'production' ||
            process.env.APP_ENV === 'production';
        const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
        const localJwtSecret = process.env.JWT_SECRET;
        let jwtPayload = null;
        const alg = peekAlg(token);
        const isAsymmetric = alg.startsWith('ES') || alg.startsWith('RS') || alg.startsWith('PS');
        const secrets = [localJwtSecret, supabaseJwtSecret].filter((s) => typeof s === 'string' && s.length >= 16);
        if (isAsymmetric) {
            const base = supabaseProjectUrl();
            if (!base) {
                return next(new Error('Authentication error: SUPABASE_URL required for asymmetric JWT'));
            }
            try {
                jwtPayload = await Promise.race([
                    verifySupabaseAccessToken(token),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('jwks timeout')), 5000)),
                ]);
            }
            catch {
                return next(new Error('Authentication error: Invalid or expired token'));
            }
        }
        else {
            if (secrets.length === 0) {
                return next(new Error('Authentication error: JWT verification secret not configured'));
            }
            // Device onboarding tokens are HS256 + JWT_SECRET. Do not fall through
            // to JWKS — LAN-only Wi-Fi has no internet and the handshake times out.
            try {
                jwtPayload = verifyWithSharedSecrets(token, secrets);
            }
            catch {
                return next(new Error('Authentication error: Invalid or expired token'));
            }
        }
        const userId = jwtPayload.sub || jwtPayload.id;
        const userEmail = jwtPayload.email || jwtPayload.user_metadata?.email || '';
        if (!userId) {
            return next(new Error('Authentication error: Missing subject claim'));
        }
        const claimTenantId = jwtPayload.tenant_id ||
            jwtPayload.tenantId ||
            jwtPayload.app_metadata?.tenantId ||
            jwtPayload.user_metadata?.tenantId ||
            null;
        const claimRole = String(jwtPayload.role || 'owner').toLowerCase();
        const isDeviceOwnerClaim = !!claimTenantId && ['owner', 'tenant_admin', 'staff'].includes(claimRole);
        // Onboarded tablets already carry tenant on the JWT. Skip the users-table
        // round trip so Engine.IO handshake finishes before the client times out.
        if (isDeviceOwnerClaim) {
            socket.data.user = {
                id: userId,
                tenant_id: claimTenantId,
                role: claimRole,
                email: userEmail,
            };
            socket.data.tenantId = claimTenantId;
            return next();
        }
        const { supabaseAdmin } = require('./db/supabase');
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
                new Promise((_, reject) => setTimeout(() => reject(new Error('socket users.byId timeout')), socketDbTimeoutMs)),
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
                    new Promise((_, reject) => setTimeout(() => reject(new Error('socket users.byEmail timeout')), socketDbTimeoutMs)),
                ]);
                if (timedEmail.data) {
                    profile = timedEmail.data;
                    profileErr = null;
                }
            }
        }
        catch (dbErr) {
            profileErr = dbErr;
        }
        if (profileErr || !profile) {
            const fallbackTenantId = jwtPayload.tenant_id ||
                jwtPayload.tenantId ||
                jwtPayload.app_metadata?.tenantId ||
                jwtPayload.user_metadata?.tenantId ||
                null;
            const claimRole = String(jwtPayload.role || 'owner').toLowerCase();
            const isDeviceOwnerClaim = !!fallbackTenantId &&
                ['owner', 'tenant_admin', 'staff'].includes(claimRole);
            if (requiresVerify && !isDeviceOwnerClaim) {
                return next(new Error('Authentication error: User profile not found'));
            }
            if (!fallbackTenantId) {
                return next(new Error('Authentication error: User profile not found'));
            }
            profile = {
                tenant_id: fallbackTenantId,
                role: claimRole === 'super_admin' || claimRole === 'admin' ? 'owner' : claimRole,
            };
        }
        socket.data.user = { id: userId, ...profile };
        socket.data.tenantId = profile.tenant_id;
        next();
    }
    catch (err) {
        next(new Error('Authentication error: Server error'));
    }
});
function socketClientIp(socket) {
    const hdr = socket.handshake.headers['x-forwarded-for'];
    const forwarded = (typeof hdr === 'string' ? hdr : Array.isArray(hdr) ? hdr[0] : '')
        ?.split(',')[0]
        ?.trim();
    const real = String(socket.handshake.headers['x-real-ip'] || '').trim();
    let ip = forwarded || real || socket.handshake.address || 'unknown';
    ip = ip.replace(/^::ffff:/, '');
    if (ip === '::1')
        ip = '127.0.0.1';
    return ip;
}
exports.io.on('connection', (socket) => {
    const handshakeDeviceId = socket.handshake.auth?.deviceId;
    if (handshakeDeviceId) {
        socket.data.deviceId = String(handshakeDeviceId);
    }
    socket.data.ip = socketClientIp(socket);
    console.log(`[Socket.io] Client connected: ${socket.id} (Tenant: ${socket.data.tenantId} IP: ${socket.data.ip})`);
    // Join global + tenant rooms immediately so broadcasts and emergency_lock
    // reach devices even if the client never emits join_room (or emits it late).
    socket.join('all');
    if (socket.data.deviceId) {
        socket.join(`device:${socket.data.deviceId}`);
    }
    if (socket.data.tenantId) {
        socket.join(`tenant:${socket.data.tenantId}`);
        console.log(`[Socket.io] Auto-joined tenant:${socket.data.tenantId} for ${socket.id}`);
        Promise.resolve().then(() => __importStar(require('./services/payment-alert-trail.service'))).then(({ PaymentAlertTrailService }) => PaymentAlertTrailService.flushTenant(exports.io, socket.data.tenantId))
            .catch((err) => console.warn('[PaymentAlert] flush on connect failed:', err?.message || err));
    }
    socket.on('payment.alert.ack', (data) => {
        const reference = String(data?.reference || '').trim();
        if (!reference || !socket.data.tenantId)
            return;
        Promise.resolve().then(() => __importStar(require('./services/payment-alert-trail.service'))).then(({ PaymentAlertTrailService }) => PaymentAlertTrailService.acknowledge(socket.data.tenantId, reference, socket.data.deviceId || null))
            .catch((err) => console.warn('[PaymentAlert] ack failed:', err?.message || err));
    });
    // Clients will emit 'join_room' passing their characteristics
    socket.on('join_room', (data) => {
        const joined = ['all'];
        // IGNORE data.tenantId, force authenticated tenantId
        if (socket.data.tenantId) {
            socket.join(`tenant:${socket.data.tenantId}`);
            joined.push(`tenant:${socket.data.tenantId}`);
        }
        if (data.plan) {
            socket.join(`plan:${String(data.plan).toLowerCase()}`);
            joined.push(`plan:${data.plan}`);
        }
        if (data.type) {
            socket.join(`type:${String(data.type).toLowerCase()}`);
            joined.push(`type:${data.type}`);
        }
        if (data.deviceId) {
            socket.data.deviceId = String(data.deviceId);
            socket.join(`device:${data.deviceId}`);
            joined.push(`device:${data.deviceId}`);
        }
        if (data.businessName) {
            socket.join(`business:${data.businessName}`);
            joined.push(`business:${data.businessName}`);
        }
        socket.join('all');
        console.log(`[Socket.io] Client ${socket.id} joined rooms: ${joined.join(', ')}`);
    });
    // Listen for real-time location updates from the mobile app
    socket.on('location_update', (data) => {
        console.log(`[Socket.io] Location update from ${socket.id}: lat=${data.lat}, lng=${data.lng}`);
        // Broadcast to all connected admin dashboards
        exports.io.to('all').emit('tenant_location', {
            socketId: socket.id,
            tenantId: data.tenantId || 'unknown',
            lat: data.lat,
            lng: data.lng
        });
    });
    socket.on('device_identity_pong', async (data) => {
        try {
            const tenantId = socket.data.tenantId || data?.tenantId;
            if (!tenantId)
                return;
            const { persistLiveDeviceIdentity } = require('./utils/persist-live-device-identity');
            const { isUsableDeviceId, normalizeDeviceId } = require('./utils/device-identity');
            const saved = await persistLiveDeviceIdentity({
                tenantId,
                deviceId: data?.deviceId,
                location: data?.location,
            });
            if (saved.deviceId && isUsableDeviceId(saved.deviceId)) {
                const serial = normalizeDeviceId(saved.deviceId);
                socket.data.deviceId = serial;
                socket.join(`device:${serial}`);
            }
        }
        catch (err) {
            console.warn('[Socket.io] device_identity_pong failed:', err?.message || err);
        }
    });
    socket.on('disconnect', () => {
        console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
});
// OS Telemetry Polling Loop (Server Metrics for Contabo)
const os = __importStar(require("os"));
if (!isJest) {
    // OS Telemetry Polling Loop (Server Metrics for Contabo)
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
        exports.io.to('all').emit('system_telemetry', {
            cpu: { label: 'CPU Usage', value: cpuUsage, color: cpuUsage > 80 ? 'red-4' : 'cyan-4' },
            memory: { label: 'Memory Usage', value: memoryUsage, color: memoryUsage > 80 ? 'red-4' : 'purple-4' },
            storage: { label: 'Disk Space', value: 32, color: 'teal-4' }, // Still mocked as os doesn't support disk natively without external lib
            network: { label: 'Network I/O', value: Math.floor(Math.random() * 40) + 10, color: 'amber-4' } // Simulated dynamic
        });
    }, 5000);
    // Run audit logs archival sweep periodically (once every 1 hour)
    setInterval(() => {
        audit_archive_service_1.AuditArchiveService.runArchiving().catch((err) => {
            console.error('[AuditArchive] Scheduled sweep failed:', err.message);
        });
    }, 60 * 60 * 1000);
    // Run an initial sweep 10 seconds after boot to process any existing stale records
    setTimeout(() => {
        audit_archive_service_1.AuditArchiveService.runArchiving().catch((err) => {
            console.error('[AuditArchive] Initial boot sweep failed:', err.message);
        });
    }, 10000);
    // Seed sample governance audit logs ONLY in LOCAL (never staging/prod)
    setTimeout(() => {
        try {
            const { BuildVariantService } = require('./config/build-variant');
            if (BuildVariantService.getInstance().isLocal()) {
                gov_audit_service_1.GovAuditService.seedSampleLogs();
            }
        }
        catch { }
    }, 3000);
}
// Only bind to a port when NOT running inside Jest/Supertest
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
    try {
        const { assertSecureBootConfiguration } = require('./config/security-boot');
        assertSecureBootConfiguration();
    }
    catch (bootErr) {
        console.error(bootErr?.message || bootErr);
        process.exit(1);
    }
    const { BuildVariantService } = require('./config/build-variant');
    const isProdVariant = BuildVariantService.getInstance().isProd();
    // Financial in-process jobs: off unless explicitly enabled (strictly forbidden in production)
    if (process.env.ENABLE_INPROCESS_FINANCIAL_WORKERS === 'true' && !isProdVariant) {
        setInterval(() => {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - 1);
            const dateStr = targetDate.toISOString().split('T')[0];
            const dbStore = new DatabaseStore_1.DatabaseStore();
            const quasarConnector = new QuasarConnector_1.QuasarConnector(null, null);
            const investigationQueueService = new InvestigationQueueService_1.InvestigationQueueService(dbStore, console);
            const job = new NightlyReconciliationJob_1.NightlyReconciliationJob(quasarConnector, dbStore, investigationQueueService, console);
            job.run(dateStr).catch((err) => {
                console.error('[NightlyReconciliation] Scheduled job failed:', err.message);
            });
        }, 24 * 60 * 60 * 1000);
        console.log('[Workers] In-process financial workers ENABLED');
    }
    else {
        console.log(`[Workers] In-process financial workers DISABLED${isProdVariant ? ' (strictly forbidden in production)' : ''}`);
    }
    // Agent webhook outbox: non-financial delivery only. Never on production.
    const stagingVariant = String(process.env.NODE_ENV || '').toLowerCase() === 'staging' ||
        String(process.env.BUILD_VARIANT || '').toUpperCase() === 'STAGING';
    const webhookWorkerOn = !isProdVariant && (process.env.ENABLE_AGENT_WEBHOOK_WORKER === 'true' || stagingVariant);
    if (webhookWorkerOn) {
        let webhookTickBusy = false;
        const webhookTick = async () => {
            if (webhookTickBusy)
                return;
            webhookTickBusy = true;
            try {
                const { deliverDueEvents } = await Promise.resolve().then(() => __importStar(require('./modules/agent-portal/services/agent-webhook.service')));
                await deliverDueEvents();
            }
            catch (err) {
                console.warn('[agent-webhook-worker]', err?.message || err);
            }
            finally {
                webhookTickBusy = false;
            }
        };
        setInterval(webhookTick, 15_000);
        setTimeout(webhookTick, 5_000);
        console.log('[Workers] Agent webhook outbox ENABLED (15s, lock, no financial mutation)');
    }
    else {
        console.log('[Workers] Agent webhook outbox DISABLED');
    }
    try {
        const variant = BuildVariantService.getInstance();
        if (variant.isStaging() && !variant.isProd() && process.env.FEE_ORCHESTRATION_LIVE === 'true') {
            const { FeePostingWorker } = require('./services/fee-posting-outbox');
            const { SupabaseFeePostingOutboxStore } = require('./services/fee-posting-outbox.stores');
            const worker = new FeePostingWorker(new SupabaseFeePostingOutboxStore());
            setInterval(() => {
                worker.runOnce(10).catch((err) => console.error('[FeeOutbox] worker:', err?.message || err));
            }, 15_000);
            console.log('[Workers] Fee posting outbox ENABLED (staging live only)');
        }
        else {
            console.log('[Workers] Fee posting outbox DISABLED');
        }
    }
    catch (err) {
        console.warn('[Workers] Fee posting outbox not started:', err?.message || err);
    }
    let paymentAlertBusy = false;
    setInterval(() => {
        if (paymentAlertBusy)
            return;
        paymentAlertBusy = true;
        Promise.resolve().then(() => __importStar(require('./services/payment-alert-trail.service'))).then(({ PaymentAlertTrailService }) => PaymentAlertTrailService.retryDue(exports.io))
            .then(() => Promise.resolve().then(() => __importStar(require('./services/payment-alert-quasar-sync'))).then((mod) => mod.syncConnectedTenantCredits(exports.io)))
            .catch((err) => console.warn('[PaymentAlert] retry failed:', err?.message || err))
            .finally(() => {
            paymentAlertBusy = false;
        });
    }, 3_000);
    // Quasar approve does not fire a webhook — poll open POUT rows via GET /transfers/{reference}.
    // Narrow status sync only; not the broader ENABLE_INPROCESS_FINANCIAL_WORKERS gate.
    if (process.env.DISABLE_PAYOUT_STATUS_POLLER !== 'true') {
        let payoutPollBusy = false;
        const payoutPollMs = Math.max(30_000, Number(process.env.PAYOUT_STATUS_POLLER_MS) || 60_000);
        setInterval(() => {
            if (payoutPollBusy)
                return;
            payoutPollBusy = true;
            Promise.resolve().then(() => __importStar(require('./services/payout-status.service'))).then(({ PayoutStatusService }) => PayoutStatusService.pollOpenPayouts(25))
                .then((result) => {
                if (result.applied > 0) {
                    console.log(`[PayoutStatus] polled ${result.checked}, applied ${result.applied}`);
                }
            })
                .catch((err) => console.warn('[PayoutStatus] poller failed:', err?.message || err))
                .finally(() => {
                payoutPollBusy = false;
            });
        }, payoutPollMs);
        console.log(`[Workers] Payout status poller ENABLED (${payoutPollMs}ms)`);
    }
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Invify SaaS (TS) running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        // Hydrate Quasar webhook signing secret from Integration Vault after boot
        (async () => {
            try {
                if (process.env.QUASAR_WEBHOOK_SIGNING_SECRET)
                    return;
                const { IntegrationVaultService } = await Promise.resolve().then(() => __importStar(require('./services/integration-vault.service')));
                for (const envName of ['PRODUCTION', 'SANDBOX']) {
                    const secret = await IntegrationVaultService.getDecryptedCredential('quasar', envName, undefined, 'QUASAR_WEBHOOK_SIGNING_SECRET');
                    if (secret) {
                        process.env.QUASAR_WEBHOOK_SIGNING_SECRET = secret;
                        process.env.QUASAR_WEBHOOK_SECRET = secret;
                        console.log(`[Boot] Hydrated QUASAR_WEBHOOK_SIGNING_SECRET / QUASAR_WEBHOOK_SECRET from Integration Vault (${envName})`);
                        break;
                    }
                }
            }
            catch (err) {
                console.warn('[Boot] Could not hydrate Quasar webhook secret from vault:', err?.message || err);
            }
        })();
        // Hydrate Meta WhatsApp Cloud API config from Integration Vault after boot
        (async () => {
            try {
                const { IntegrationVaultService } = await Promise.resolve().then(() => __importStar(require('./services/integration-vault.service')));
                for (const envName of ['PRODUCTION', 'SANDBOX']) {
                    const hydrated = await IntegrationVaultService.hydrateMetaWhatsAppFromVault(envName);
                    if (hydrated.length > 0) {
                        console.log(`[Boot] Hydrated Meta WhatsApp from Integration Vault (${envName}): ${hydrated.join(', ')}`);
                        break;
                    }
                }
            }
            catch (err) {
                console.warn('[Boot] Could not hydrate Meta WhatsApp from vault:', err?.message || err);
            }
        })();
    });
}
exports.default = app;
// touch2
//# sourceMappingURL=app.js.map