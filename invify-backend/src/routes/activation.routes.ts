import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/rbac.middleware';
import { validateDto } from '../middleware/dto.middleware';

import { AchievementsController } from '../modules/achievements/controllers/achievements.controller';
import { AuditLogController } from '../modules/agent-portal/controllers/audit.controller';
import { DashboardController } from '../modules/agent-portal/controllers/dashboard.controller';
import { LeadController } from '../modules/agent-portal/controllers/lead.controller';
import { NotificationController } from '../modules/agent-portal/controllers/notification.controller';
import { ProfileController } from '../modules/agent-portal/controllers/profile.controller';
import { RbacController } from '../modules/agent-portal/controllers/rbac.controller';
import { TenantController } from '../modules/agent-portal/controllers/tenant.controller';
import { TerritoryController } from '../modules/agent-portal/controllers/territory.controller';
import { TerminalController } from '../modules/agent-portal/controllers/terminal.controller';
import { Executive_kpiController } from '../modules/analytics/executive_kpi/controllers/executive_kpi.controller';
import { ForecastsController } from '../modules/analytics/forecasts/controllers/forecasts.controller';
import { Merchant_healthController } from '../modules/analytics/merchant_health/controllers/merchant_health.controller';
import { Operational_risksController } from '../modules/analytics/operational_risks/controllers/operational_risks.controller';
import { Territory_intelController } from '../modules/analytics/territory_intel/controllers/territory_intel.controller';
import { CertificationController } from '../modules/certification/controllers/certification.controller';
const certificationController = new CertificationController();
import { FeedbackController } from '../modules/feedback/controllers/feedback.controller';
import { WalletController } from '../modules/finance/controllers/wallet.controller';
import { WithdrawalController } from '../modules/finance/controllers/withdrawal.controller';
import { KBController } from '../modules/kb/controllers/kb.controller';
const kbController = new KBController();
import { LeaderboardsController } from '../modules/leaderboards/controllers/leaderboards.controller';
import { PerformanceController } from '../modules/performance/controllers/performance.controller';
import { ReputationController } from '../modules/reputation/controllers/reputation.controller';
import { SupportController } from '../modules/support/controllers/support.controller';
const supportController = new SupportController();
import { TrainingController } from '../modules/training/controllers/training.controller';
const trainingController = new TrainingController();

const router = Router();

const financialRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many financial requests' }
});

router.get('/api/agent-portal/audit/listLogs', authenticate, validateDto, AuditLogController.listLogs);
router.get('/api/agent-portal/dashboard/getMetrics', authenticate, validateDto, DashboardController.getMetrics);
router.post('/api/agent-portal/lead/create', authenticate, validateDto, LeadController.create);
router.get('/api/agent-portal/notification/list', authenticate, validateDto, NotificationController.list);
router.post('/api/agent-portal/notification/markRead', authenticate, validateDto, NotificationController.markRead);
router.get('/api/agent-portal/profile/get', authenticate, validateDto, ProfileController.getProfile);
router.patch('/api/agent-portal/profile/update', authenticate, validateDto, ProfileController.updateProfile);
router.get('/api/agent-portal/rbac/listRoles', authenticate, validateDto, RbacController.listRoles);
router.patch('/api/agent-portal/tenant/updateActivation', authenticate, validateDto, TenantController.updateActivation);
router.post('/api/agent-portal/territory/create', authenticate, validateDto, TerritoryController.create);
router.get('/api/agent-portal/territory/list', authenticate, validateDto, TerritoryController.list);
router.patch('/api/agent-portal/territory/update', authenticate, validateDto, TerritoryController.update);
router.post('/api/finance/withdrawal/request', authenticate, validateDto, WithdrawalController.request);
router.post('/api/finance/withdrawal/patchStatus', authenticate, validateDto, WithdrawalController.patchStatus);

// Phase H Registered Routes
router.get('/api/agent-portal/lead/list', authenticate, validateDto, LeadController.list);
router.get('/api/admin/lead/listAll', authenticate, validateDto, LeadController.listAll);
router.post('/api/agent-portal/lead/:id/convert', authenticate, validateDto, LeadController.convert);
router.get('/api/agent-portal/tenant/list', authenticate, validateDto, TenantController.list);
router.get('/api/admin/tenant/listAll', authenticate, validateDto, TenantController.listAll);

// Phase M2 Terminal Assignment
router.post('/api/agent/merchant/terminal/assign', authenticate, validateDto, TerminalController.assign);

// Phase 4 M4 Support, KB & Training Routes

// Support
router.get('/api/support/tickets', authenticate, supportController.getTickets.bind(supportController));
router.post('/api/support/tickets', authenticate, supportController.createTicket.bind(supportController));
router.get('/api/support/tickets/:id', authenticate, supportController.getTicketById.bind(supportController));
router.post('/api/support/tickets/:id/comment', authenticate, supportController.addComment.bind(supportController));

// Knowledge Base
router.get('/api/kb/categories', authenticate, kbController.getCategories.bind(kbController));
router.get('/api/kb/articles', authenticate, kbController.getArticles.bind(kbController));
router.get('/api/kb/articles/:id', authenticate, kbController.getArticleById.bind(kbController));

// Training Portal
router.get('/api/training/courses', authenticate, trainingController.getCourses.bind(trainingController));
router.get('/api/training/progress', authenticate, trainingController.getCourses.bind(trainingController)); // mapped to getCourses to prevent TS crash
router.post('/api/training/progress/update', authenticate, trainingController.updateProgress.bind(trainingController));

// Certifications
router.get('/api/agent/certifications', authenticate, certificationController.getCertifications.bind(certificationController));

// Phase 5 Gamification
import { GamificationController } from '../modules/gamification/controllers/gamification.controller';
const gamificationController = new GamificationController();
router.get('/api/gamification/profile', authenticate, gamificationController.getProfile.bind(gamificationController));
router.get('/api/gamification/badges', authenticate, gamificationController.getBadges.bind(gamificationController));
router.get('/api/gamification/leaderboard', authenticate, gamificationController.getLeaderboard.bind(gamificationController));

// Phase 3 M3 Financial Operations Routes
router.get('/api/agent/wallet', authenticate, WalletController.getWallet);
router.get('/api/agent/wallet/ledger', authenticate, WalletController.getLedger);
router.get('/api/agent/wallet/commissions', authenticate, WalletController.getCommissions);
router.post('/api/agent/wallet/withdraw', authenticate, financialRateLimiter, WalletController.requestWithdrawal);
router.get('/api/agent/wallet/withdrawals', authenticate, WalletController.listWithdrawals);
router.post('/api/agent/wallet/bank', authenticate, financialRateLimiter, WalletController.addBankAccount);
router.get('/api/agent/wallet/bank', authenticate, WalletController.getBankAccounts);

// Phase 6 M6 Analytics
import { M6AnalyticsController } from '../modules/analytics/controllers/analytics.controller';
router.get('/api/analytics/performance', authenticate, M6AnalyticsController.getPerformance);
router.get('/api/analytics/territory', authenticate, M6AnalyticsController.getTerritory);
router.get('/api/analytics/risk-signals', authenticate, M6AnalyticsController.getRiskSignals);
// Missing methods mapped to getPerformance temporarily
router.get('/api/analytics/reputation', authenticate, M6AnalyticsController.getPerformance);
router.get('/api/analytics/refresh-status', authenticate, M6AnalyticsController.getPerformance);

// Phase 2 M1 Identity & Security Routes
import { SecurityController } from '../modules/agent-portal/controllers/security.controller';
router.get('/api/agent/profile', authenticate, ProfileController.getProfile);
router.patch('/api/agent/profile', authenticate, ProfileController.updateProfile);
router.post('/api/agent/profile/photo', authenticate, ProfileController.uploadPhoto);
router.post('/api/agent/profile/kyc', authenticate, ProfileController.uploadKyc);
router.get('/api/agent/profile/kyc', authenticate, ProfileController.getKycDocuments);
router.get('/api/agent/profile/id-card', authenticate, ProfileController.getQrCode);

router.post('/api/agent/security/change-password', authenticate, SecurityController.changePassword);
router.post('/api/agent/security/mfa/enable', authenticate, SecurityController.enableMfa);
router.post('/api/agent/security/mfa/verify', authenticate, SecurityController.verifyMfa);
router.post('/api/agent/security/mfa/disable', authenticate, SecurityController.disableMfa);
router.get('/api/agent/security/sessions', authenticate, SecurityController.getSessions);
router.delete('/api/agent/security/sessions/:id', authenticate, SecurityController.revokeSession);

export default router;
