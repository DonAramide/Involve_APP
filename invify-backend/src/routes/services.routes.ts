import { Router } from 'express';
import { ServicesDashboardController } from '../controllers/services-dashboard.controller';
import { checkRole } from '../middleware/rbac.middleware';

const router = Router();
const tenantRoles = ['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier'];

router.get('/summary', checkRole(tenantRoles), ServicesDashboardController.getSummary);
router.post('/sync/jobs', checkRole(tenantRoles), ServicesDashboardController.syncJobs);
router.post('/sync/payments', checkRole(tenantRoles), ServicesDashboardController.syncPayments);
router.post('/sync/customers', checkRole(tenantRoles), ServicesDashboardController.syncCustomers);

export default router;
