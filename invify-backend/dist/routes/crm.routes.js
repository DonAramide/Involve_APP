"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customer_controller_1 = require("../controllers/customer.controller");
const router = (0, express_1.Router)();
router.get('/customers', customer_controller_1.CustomerController.searchCustomers);
router.post('/customers', customer_controller_1.CustomerController.createCustomer);
router.get('/customers/:id/summary', customer_controller_1.CustomerController.getCustomerSummary);
router.put('/customers/:id', customer_controller_1.CustomerController.updateCustomer);
router.post('/finance/customer-virtual-account/:customerId', customer_controller_1.CustomerController.getVirtualAccount);
exports.default = router;
//# sourceMappingURL=crm.routes.js.map