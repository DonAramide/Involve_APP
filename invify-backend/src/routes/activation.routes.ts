
import { Router } from 'express';
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
import { Executive_kpiController } from '../modules/analytics/executive_kpi/controllers/executive_kpi.controller';
import { ForecastsController } from '../modules/analytics/forecasts/controllers/forecasts.controller';
import { Merchant_healthController } from '../modules/analytics/merchant_health/controllers/merchant_health.controller';
import { Operational_risksController } from '../modules/analytics/operational_risks/controllers/operational_risks.controller';
import { Territory_intelController } from '../modules/analytics/territory_intel/controllers/territory_intel.controller';
import { CertificationController } from '../modules/certification/controllers/certification.controller';
import { FeedbackController } from '../modules/feedback/controllers/feedback.controller';
import { WalletController } from '../modules/finance/controllers/wallet.controller';
import { WithdrawalController } from '../modules/finance/controllers/withdrawal.controller';
import { KbController } from '../modules/kb/controllers/kb.controller';
import { LeaderboardsController } from '../modules/leaderboards/controllers/leaderboards.controller';
import { PerformanceController } from '../modules/performance/controllers/performance.controller';
import { ReputationController } from '../modules/reputation/controllers/reputation.controller';
import { SupportController } from '../modules/support/controllers/support.controller';
import { TrainingController } from '../modules/training/controllers/training.controller';

const router = Router();

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
router.get('/api/agent-portal/tenant/list', authenticate, validateDto, TenantController.list);
router.get('/api/admin/tenant/listAll', authenticate, validateDto, TenantController.listAll);
router.get('/api/training/courses/list', authenticate, validateDto, TrainingController.listCourses);
router.get('/api/support/tickets/list', authenticate, validateDto, SupportController.list);
router.get('/api/analytics/executive_kpi/snapshots', authenticate, validateDto, Executive_kpiController.getSnapshots);

// Phase 3 M3 Financial Operations Routes
router.get('/api/agent/wallet', authenticate, WalletController.getWallet);
router.get('/api/agent/wallet/ledger', authenticate, WalletController.getLedger);
router.get('/api/agent/wallet/commissions', authenticate, WalletController.getCommissions);
router.post('/api/agent/wallet/withdrawals', authenticate, WalletController.requestWithdrawal);
router.get('/api/agent/wallet/withdrawals', authenticate, WalletController.listWithdrawals);
router.post('/api/agent/wallet/bank-account', authenticate, WalletController.addBankAccount);
router.get('/api/agent/wallet/bank-account', authenticate, WalletController.getBankAccounts);


// Phase 2 M1 Identity & Security Routes
import { SecurityController } from '../modules/agent-portal/controllers/security.controller';
router.get('/api/agent/profile', authenticate, ProfileController.getProfile);
router.patch('/api/agent/profile', authenticate, ProfileController.updateProfile);
router.post('/api/agent/profile/photo', authenticate, ProfileController.uploadPhoto);
router.post('/api/agent/profile/kyc', authenticate, ProfileController.uploadKyc);
router.get('/api/agent/profile/kyc', authenticate, ProfileController.getKycDocuments);
router.get('/api/agent/profile/qr', authenticate, ProfileController.getQrCode);

router.post('/api/agent/security/change-password', authenticate, SecurityController.changePassword);
router.post('/api/agent/security/mfa/enable', authenticate, SecurityController.enableMfa);
router.post('/api/agent/security/mfa/disable', authenticate, SecurityController.disableMfa);
router.get('/api/agent/security/sessions', authenticate, SecurityController.getSessions);
router.delete('/api/agent/security/sessions/:id', authenticate, SecurityController.revokeSession);

export default router;
