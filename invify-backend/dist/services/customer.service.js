"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerService = exports.CustomerService = void 0;
const customer_repository_1 = require("../repositories/customer.repository");
const supabase_1 = require("../db/supabase");
// Mock dependencies (In a real system these would be injected)
class FinanceFacade {
    static async getCustomerAggregates(tenantId, customerId) {
        // Queries ledger, wallet, invoices
        return {
            walletBalance: 0,
            totalInvoiced: 0,
            totalPaid: 0,
            totalOutstanding: 0
        };
    }
}
class TimelineProvider {
    static getCustomerTimelineProviders() {
        return [
            'CustomerTimelineProvider',
            'InvoiceTimelineProvider',
            'PaymentTimelineProvider',
            'WalletTimelineProvider',
            'AuditTimelineProvider',
            'AppointmentTimelineProvider'
        ];
    }
}
class CustomerService {
    repository;
    constructor(repository = new customer_repository_1.CustomerRepository()) {
        this.repository = repository;
    }
    async searchCustomers(tenantId, options) {
        const result = await this.repository.search(tenantId, options);
        const data = result.data.map((c) => CustomerService.mapToDTO(c));
        return {
            data,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.pageSize
            }
        };
    }
    async getCustomerSummary(tenantId, customerId) {
        const customer = await this.repository.getById(tenantId, customerId);
        if (!customer)
            return null;
        const finance = await FinanceFacade.getCustomerAggregates(tenantId, customerId);
        // Providers ready for TimelineService merging
        const timelineProviders = TimelineProvider.getCustomerTimelineProviders();
        return {
            ...CustomerService.mapToDTO(customer),
            finance,
            businessModeProjection: {
                // Expandable placeholder based on tenant context
                type: 'Retail',
                totalPurchases: 0,
                outstandingBalance: 0
            }
        };
    }
    async createCustomer(tenantId, data) {
        const id = data.id || crypto.randomUUID();
        const { data: created, error } = await supabase_1.supabase
            .from('customers')
            .insert({
            id,
            tenant_id: tenantId,
            name: data.name,
            phone: data.phone,
            address: data.address,
            balance: data.balance || 0,
            email: data.email,
            status: data.status || 'ACTIVE'
        })
            .select()
            .single();
        if (error)
            throw new Error(`Failed to create customer: ${error.message}`);
        return CustomerService.mapToDTO(created);
    }
    async updateCustomer(tenantId, customerId, data) {
        const { data: updated, error } = await supabase_1.supabase
            .from('customers')
            .update({
            name: data.name,
            phone: data.phone,
            address: data.address,
            email: data.email,
            status: data.status
        })
            .eq('tenant_id', tenantId)
            .eq('id', customerId)
            .select()
            .single();
        if (error)
            throw new Error(`Failed to update customer: ${error.message}`);
        return CustomerService.mapToDTO(updated);
    }
    static mapToDTO(entity) {
        return {
            id: entity.id,
            name: entity.name,
            phone: entity.phone,
            address: entity.address,
            email: entity.email,
            status: entity.status || 'ACTIVE',
            balance: entity.balance || 0,
            tags: entity.tags || [],
            createdAt: entity.created_at,
            updatedAt: entity.updated_at
        };
    }
}
exports.CustomerService = CustomerService;
exports.customerService = new CustomerService();
//# sourceMappingURL=customer.service.js.map