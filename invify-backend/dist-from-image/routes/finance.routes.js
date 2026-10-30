"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finance_controller_1 = require("../controllers/finance.controller");
const invoice_controller_1 = require("../controllers/invoice.controller");
const financial_command_controller_1 = require("../controllers/financial-command.controller");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const router = (0, express_1.Router)();
// Executive Finance (mounted under /api/v1/finance with authenticate)
router.get('/executive-summary', (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), finance_controller_1.ExecutiveFinanceController.getSummary);
router.post('/quasar-resync', (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin']), finance_controller_1.ExecutiveFinanceController.resyncQuasar);
router.get('/stats/payouts', finance_controller_1.ExecutiveFinanceController.getPayoutStats);
router.get('/settlement-phases', finance_controller_1.ExecutiveFinanceController.getSettlementPhases);
router.post('/commands/parent-fund', (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), financial_command_controller_1.FinancialCommandController.parentFund);
router.post('/commands/parent-allocate', (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), financial_command_controller_1.FinancialCommandController.parentAllocate);
router.get('/invoices/collection-summary', (0, rbac_middleware_1.checkRole)(['super_admin', 'tenant_admin', 'finance_staff', 'owner', 'admin', 'staff', 'cashier']), finance_controller_1.ExecutiveFinanceController.getCollectionSummary);
// Invoices (REST Wrapper around Sync Engine)
router.post('/invoices/bulk-sync', invoice_controller_1.InvoiceController.bulkSyncInvoices);
router.post('/invoices', invoice_controller_1.InvoiceController.createInvoice);
router.get('/invoices', invoice_controller_1.InvoiceController.getInvoices);
router.get('/invoices/:id', invoice_controller_1.InvoiceController.getInvoice);
router.post('/invoices/:id/pay', invoice_controller_1.InvoiceController.recordPayment);
router.get('/invoices/:id/timeline', invoice_controller_1.InvoiceController.getTimeline);
exports.default = router;
//# sourceMappingURL=finance.routes.js.map