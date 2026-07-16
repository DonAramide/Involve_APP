"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finance_controller_1 = require("../controllers/finance.controller");
const invoice_controller_1 = require("../controllers/invoice.controller");
const router = (0, express_1.Router)();
// Executive Finance
router.get('/executive-summary', finance_controller_1.ExecutiveFinanceController.getSummary);
router.get('/stats/payouts', finance_controller_1.ExecutiveFinanceController.getPayoutStats);
router.get('/settlement-phases', finance_controller_1.ExecutiveFinanceController.getSettlementPhases);
// Invoices (REST Wrapper around Sync Engine)
router.post('/invoices', invoice_controller_1.InvoiceController.createInvoice);
router.get('/invoices', invoice_controller_1.InvoiceController.getInvoices);
router.get('/invoices/:id', invoice_controller_1.InvoiceController.getInvoice);
router.post('/invoices/:id/pay', invoice_controller_1.InvoiceController.recordPayment);
router.get('/invoices/:id/timeline', invoice_controller_1.InvoiceController.getTimeline);
exports.default = router;
//# sourceMappingURL=finance.routes.js.map