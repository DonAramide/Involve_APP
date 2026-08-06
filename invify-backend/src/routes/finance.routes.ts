import { Router } from 'express';
import { ExecutiveFinanceController } from '../controllers/finance.controller';
import { InvoiceController } from '../controllers/invoice.controller';
import { checkRole } from '../middleware/rbac.middleware';

const router = Router();

// Executive Finance (mounted under /api/v1/finance with authenticate)
router.get(
  '/executive-summary',
  checkRole(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']),
  ExecutiveFinanceController.getSummary,
);
router.get('/stats/payouts', ExecutiveFinanceController.getPayoutStats);
router.get('/settlement-phases', ExecutiveFinanceController.getSettlementPhases);

// Invoices (REST Wrapper around Sync Engine)
router.post('/invoices/bulk-sync', InvoiceController.bulkSyncInvoices);
router.post('/invoices', InvoiceController.createInvoice);
router.get('/invoices', InvoiceController.getInvoices);
router.get('/invoices/:id', InvoiceController.getInvoice);
router.post('/invoices/:id/pay', InvoiceController.recordPayment);
router.get('/invoices/:id/timeline', InvoiceController.getTimeline);

export default router;
