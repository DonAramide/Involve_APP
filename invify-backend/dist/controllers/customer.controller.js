"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const factory_1 = require("../integrations/quasar/factory");
const audit_service_1 = require("../services/audit.service");
const customer_service_1 = require("../services/customer.service");
class CustomerController {
    /**
     * POST /api/finance/customer-virtual-account/:customerId
     */
    static async getVirtualAccount(req, res) {
        try {
            const { customerId } = req.params;
            const tenantId = req.user?.tenantId;
            const { name, email, phone } = req.body;
            if (!customerId)
                return res.status(400).json({ error: "Customer ID is required" });
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            const quasar = await (0, factory_1.getQuasarService)(tenantId);
            const reference = `VA-CUST-${customerId.substring(0, 8)}-${Date.now()}`;
            const quasarAccount = await quasar.createVirtualAccount({
                childId: customerId,
                parentId: tenantId,
                email: email || `customer-${customerId.substring(0, 8)}@invify.com`,
                firstName: name?.split(' ')[0] || 'Valued',
                lastName: name?.split(' ').slice(1).join(' ') || 'Customer',
                metadata: { source: 'customer_provisioning', phone: phone }
            });
            await audit_service_1.AuditService.log({
                eventType: 'virtual_account.created',
                reference,
                tenantId: tenantId,
                payload: { customerId, accountNumber: quasarAccount.accountNumber, bankName: quasarAccount.bankName }
            });
            return res.status(200).json({
                accountNumber: quasarAccount.accountNumber,
                bankName: quasarAccount.bankName,
                accountName: quasarAccount.accountName || name
            });
        }
        catch (error) {
            console.error('[CustomerController] getVirtualAccount Error:', error.message);
            return res.status(500).json({ error: "Failed to provision customer virtual account" });
        }
    }
    static async searchCustomers(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
            const options = {
                page: parseInt(req.query.page) || 1,
                pageSize: parseInt(req.query.pageSize) || 50,
                search: req.query.search,
                sort: req.query.sort,
                direction: req.query.direction,
                status: req.query.status,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo
            };
            const result = await customer_service_1.customerService.searchCustomers(tenantId, options);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error('[CustomerController] searchCustomers Error:', error.message);
            return res.status(500).json({ error: "Failed to search customers" });
        }
    }
    static async getCustomerSummary(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const customerId = req.params.id;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized" });
            const summary = await customer_service_1.customerService.getCustomerSummary(tenantId, customerId);
            if (!summary)
                return res.status(404).json({ error: "Customer not found" });
            return res.status(200).json(summary);
        }
        catch (error) {
            console.error('[CustomerController] getCustomerSummary Error:', error.message);
            return res.status(500).json({ error: "Failed to fetch customer summary" });
        }
    }
    static async createCustomer(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized" });
            const customer = await customer_service_1.customerService.createCustomer(tenantId, req.body);
            return res.status(201).json(customer);
        }
        catch (error) {
            console.error('[CustomerController] createCustomer Error:', error.message);
            return res.status(500).json({ error: "Failed to create customer" });
        }
    }
    static async updateCustomer(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const customerId = req.params.id;
            if (!tenantId)
                return res.status(401).json({ error: "Unauthorized" });
            const customer = await customer_service_1.customerService.updateCustomer(tenantId, customerId, req.body);
            return res.status(200).json(customer);
        }
        catch (error) {
            console.error('[CustomerController] updateCustomer Error:', error.message);
            return res.status(500).json({ error: "Failed to update customer" });
        }
    }
}
exports.CustomerController = CustomerController;
//# sourceMappingURL=customer.controller.js.map