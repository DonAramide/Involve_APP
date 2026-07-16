import { Router } from 'express';
import { ExecutiveFinanceController } from '../controllers/finance.controller';
import { InvoiceController } from '../controllers/invoice.controller';

const router = Router();

// Executive Finance
router.get('/executive-summary', ExecutiveFinanceController.getSummary);
router.get('/stats/payouts', ExecutiveFinanceController.getPayoutStats);
router.get('/settlement-phases', ExecutiveFinanceController.getSettlementPhases);

// Invoices (REST Wrapper around Sync Engine)
router.post('/invoices', InvoiceController.createInvoice);
router.get('/invoices', InvoiceController.getInvoices);
router.get('/invoices/:id', InvoiceController.getInvoice);
router.post('/invoices/:id/pay', InvoiceController.recordPayment);
router.get('/invoices/:id/timeline', InvoiceController.getTimeline);

export default router;
