"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const dto_middleware_1 = require("../middleware/dto.middleware");
const audit_controller_1 = require("../modules/agent-portal/controllers/audit.controller");
const dashboard_controller_1 = require("../modules/agent-portal/controllers/dashboard.controller");
const lead_controller_1 = require("../modules/agent-portal/controllers/lead.controller");
const notification_controller_1 = require("../modules/agent-portal/controllers/notification.controller");
const profile_controller_1 = require("../modules/agent-portal/controllers/profile.controller");
const rbac_controller_1 = require("../modules/agent-portal/controllers/rbac.controller");
const tenant_controller_1 = require("../modules/agent-portal/controllers/tenant.controller");
const territory_controller_1 = require("../modules/agent-portal/controllers/territory.controller");
const terminal_controller_1 = require("../modules/agent-portal/controllers/terminal.controller");
const certification_controller_1 = require("../modules/certification/controllers/certification.controller");
const certificationController = new certification_controller_1.CertificationController();
const wallet_controller_1 = require("../modules/finance/controllers/wallet.controller");
const withdrawal_controller_1 = require("../modules/finance/controllers/withdrawal.controller");
const kb_controller_1 = require("../modules/kb/controllers/kb.controller");
const kbController = new kb_controller_1.KBController();
const support_controller_1 = require("../modules/support/controllers/support.controller");
const supportController = new support_controller_1.SupportController();
const training_controller_1 = require("../modules/training/controllers/training.controller");
const trainingController = new training_controller_1.TrainingController();
const router = (0, express_1.Router)();
const financialRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many financial requests' }
});
router.get('/api/agent-portal/audit/listLogs', auth_middleware_1.authenticate, dto_middleware_1.validateDto, audit_controller_1.AuditLogController.listLogs);
router.get('/api/agent-portal/dashboard/getMetrics', auth_middleware_1.authenticate, dto_middleware_1.validateDto, dashboard_controller_1.DashboardController.getMetrics);
router.post('/api/agent-portal/lead/create', auth_middleware_1.authenticate, dto_middleware_1.validateDto, lead_controller_1.LeadController.create);
router.get('/api/agent-portal/notification/list', auth_middleware_1.authenticate, dto_middleware_1.validateDto, notification_controller_1.NotificationController.list);
router.post('/api/agent-portal/notification/markRead', auth_middleware_1.authenticate, dto_middleware_1.validateDto, notification_controller_1.NotificationController.markRead);
router.get('/api/agent-portal/profile/get', auth_middleware_1.authenticate, dto_middleware_1.validateDto, profile_controller_1.ProfileController.getProfile);
router.patch('/api/agent-portal/profile/update', auth_middleware_1.authenticate, dto_middleware_1.validateDto, profile_controller_1.ProfileController.updateProfile);
router.get('/api/agent-portal/rbac/listRoles', auth_middleware_1.authenticate, dto_middleware_1.validateDto, rbac_controller_1.RbacController.listRoles);
router.patch('/api/agent-portal/tenant/updateActivation', auth_middleware_1.authenticate, dto_middleware_1.validateDto, tenant_controller_1.TenantController.updateActivation);
router.post('/api/agent-portal/territory/create', auth_middleware_1.authenticate, dto_middleware_1.validateDto, territory_controller_1.TerritoryController.create);
router.get('/api/agent-portal/territory/list', auth_middleware_1.authenticate, dto_middleware_1.validateDto, territory_controller_1.TerritoryController.list);
router.patch('/api/agent-portal/territory/update', auth_middleware_1.authenticate, dto_middleware_1.validateDto, territory_controller_1.TerritoryController.update);
router.post('/api/finance/withdrawal/request', auth_middleware_1.authenticate, dto_middleware_1.validateDto, withdrawal_controller_1.WithdrawalController.request);
router.post('/api/finance/withdrawal/patchStatus', auth_middleware_1.authenticate, dto_middleware_1.validateDto, withdrawal_controller_1.WithdrawalController.patchStatus);
// Phase H Registered Routes
router.get('/api/agent-portal/lead/list', auth_middleware_1.authenticate, dto_middleware_1.validateDto, lead_controller_1.LeadController.list);
router.get('/api/admin/lead/listAll', auth_middleware_1.authenticate, dto_middleware_1.validateDto, lead_controller_1.LeadController.listAll);
router.post('/api/agent-portal/lead/:id/convert', auth_middleware_1.authenticate, dto_middleware_1.validateDto, lead_controller_1.LeadController.convert);
router.get('/api/agent-portal/tenant/list', auth_middleware_1.authenticate, dto_middleware_1.validateDto, tenant_controller_1.TenantController.list);
router.get('/api/admin/tenant/listAll', auth_middleware_1.authenticate, dto_middleware_1.validateDto, tenant_controller_1.TenantController.listAll);
// Phase M2 Terminal Assignment
router.post('/api/agent/merchant/terminal/assign', auth_middleware_1.authenticate, dto_middleware_1.validateDto, terminal_controller_1.TerminalController.assign);
// Phase 4 M4 Support, KB & Training Routes
// Support
router.get('/api/support/tickets', auth_middleware_1.authenticate, supportController.getTickets.bind(supportController));
router.post('/api/support/tickets', auth_middleware_1.authenticate, supportController.createTicket.bind(supportController));
router.get('/api/support/tickets/:id', auth_middleware_1.authenticate, supportController.getTicketById.bind(supportController));
router.post('/api/support/tickets/:id/comment', auth_middleware_1.authenticate, supportController.addComment.bind(supportController));
// Knowledge Base
router.get('/api/kb/categories', auth_middleware_1.authenticate, kbController.getCategories.bind(kbController));
router.get('/api/kb/articles', auth_middleware_1.authenticate, kbController.getArticles.bind(kbController));
router.get('/api/kb/articles/:id', auth_middleware_1.authenticate, kbController.getArticleById.bind(kbController));
// Training Portal
router.get('/api/training/courses', auth_middleware_1.authenticate, trainingController.getCourses.bind(trainingController));
router.get('/api/training/progress', auth_middleware_1.authenticate, trainingController.getCourses.bind(trainingController)); // mapped to getCourses to prevent TS crash
router.post('/api/training/progress/update', auth_middleware_1.authenticate, trainingController.updateProgress.bind(trainingController));
// Certifications
router.get('/api/agent/certifications', auth_middleware_1.authenticate, certificationController.getCertifications.bind(certificationController));
// Phase 5 Gamification
const gamification_controller_1 = require("../modules/gamification/controllers/gamification.controller");
const gamificationController = new gamification_controller_1.GamificationController();
router.get('/api/gamification/profile', auth_middleware_1.authenticate, gamificationController.getProfile.bind(gamificationController));
router.get('/api/gamification/badges', auth_middleware_1.authenticate, gamificationController.getBadges.bind(gamificationController));
router.get('/api/gamification/leaderboard', auth_middleware_1.authenticate, gamificationController.getLeaderboard.bind(gamificationController));
// Phase 3 M3 Financial Operations Routes
router.get('/api/agent/wallet', auth_middleware_1.authenticate, wallet_controller_1.WalletController.getWallet);
router.get('/api/agent/wallet/ledger', auth_middleware_1.authenticate, wallet_controller_1.WalletController.getLedger);
router.get('/api/agent/wallet/commissions', auth_middleware_1.authenticate, wallet_controller_1.WalletController.getCommissions);
router.post('/api/agent/wallet/withdraw', auth_middleware_1.authenticate, financialRateLimiter, wallet_controller_1.WalletController.requestWithdrawal);
router.get('/api/agent/wallet/withdrawals', auth_middleware_1.authenticate, wallet_controller_1.WalletController.listWithdrawals);
router.post('/api/agent/wallet/bank', auth_middleware_1.authenticate, financialRateLimiter, wallet_controller_1.WalletController.addBankAccount);
router.get('/api/agent/wallet/bank', auth_middleware_1.authenticate, wallet_controller_1.WalletController.getBankAccounts);
// Phase 6 M6 Analytics
const analytics_controller_1 = require("../modules/analytics/controllers/analytics.controller");
router.get('/api/analytics/performance', auth_middleware_1.authenticate, analytics_controller_1.M6AnalyticsController.getPerformance);
router.get('/api/analytics/territory', auth_middleware_1.authenticate, analytics_controller_1.M6AnalyticsController.getTerritory);
router.get('/api/analytics/risk-signals', auth_middleware_1.authenticate, analytics_controller_1.M6AnalyticsController.getRiskSignals);
// Missing methods mapped to getPerformance temporarily
router.get('/api/analytics/reputation', auth_middleware_1.authenticate, analytics_controller_1.M6AnalyticsController.getPerformance);
router.get('/api/analytics/refresh-status', auth_middleware_1.authenticate, analytics_controller_1.M6AnalyticsController.getPerformance);
// Phase 2 M1 Identity & Security Routes
const security_controller_1 = require("../modules/agent-portal/controllers/security.controller");
router.get('/api/agent/profile', auth_middleware_1.authenticate, profile_controller_1.ProfileController.getProfile);
router.patch('/api/agent/profile', auth_middleware_1.authenticate, profile_controller_1.ProfileController.updateProfile);
router.post('/api/agent/profile/photo', auth_middleware_1.authenticate, profile_controller_1.ProfileController.uploadPhoto);
router.post('/api/agent/profile/kyc', auth_middleware_1.authenticate, profile_controller_1.ProfileController.uploadKyc);
router.get('/api/agent/profile/kyc', auth_middleware_1.authenticate, profile_controller_1.ProfileController.getKycDocuments);
router.get('/api/agent/profile/id-card', auth_middleware_1.authenticate, profile_controller_1.ProfileController.getQrCode);
router.post('/api/agent/security/change-password', auth_middleware_1.authenticate, security_controller_1.SecurityController.changePassword);
router.post('/api/agent/security/mfa/enable', auth_middleware_1.authenticate, security_controller_1.SecurityController.enableMfa);
router.post('/api/agent/security/mfa/verify', auth_middleware_1.authenticate, security_controller_1.SecurityController.verifyMfa);
router.post('/api/agent/security/mfa/disable', auth_middleware_1.authenticate, security_controller_1.SecurityController.disableMfa);
router.get('/api/agent/security/sessions', auth_middleware_1.authenticate, security_controller_1.SecurityController.getSessions);
router.delete('/api/agent/security/sessions/:id', auth_middleware_1.authenticate, security_controller_1.SecurityController.revokeSession);
exports.default = router;
//# sourceMappingURL=activation.routes.js.map