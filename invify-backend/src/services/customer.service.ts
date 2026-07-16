import { ICustomerRepository, CustomerRepository } from '../repositories/customer.repository';
import { CustomerDTO, CustomerProfileDTO, CustomerSearchResponseDTO, CustomerStatus } from '../types/customer.dto';
import { supabase } from '../db/supabase';

// Mock dependencies (In a real system these would be injected)
class FinanceFacade {
  static async getCustomerAggregates(tenantId: string, customerId: string) {
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

export class CustomerService {
  private repository: ICustomerRepository;

  constructor(repository: ICustomerRepository = new CustomerRepository()) {
    this.repository = repository;
  }

  async searchCustomers(tenantId: string, options: { 
    page?: number; 
    pageSize?: number; 
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    status?: CustomerStatus;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<CustomerSearchResponseDTO> {
    const result = await this.repository.search(tenantId, options);
    
    const data: CustomerDTO[] = result.data.map((c: any) => CustomerService.mapToDTO(c));
    
    return {
      data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.pageSize
      }
    };
  }

  async getCustomerSummary(tenantId: string, customerId: string): Promise<CustomerProfileDTO | null> {
    const customer = await this.repository.getById(tenantId, customerId);
    if (!customer) return null;

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

  async createCustomer(tenantId: string, data: Partial<CustomerDTO>): Promise<CustomerDTO> {
    const id = data.id || crypto.randomUUID();
    
    const { data: created, error } = await supabase
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

    if (error) throw new Error(`Failed to create customer: ${error.message}`);
    
    return CustomerService.mapToDTO(created);
  }

  async updateCustomer(tenantId: string, customerId: string, data: Partial<CustomerDTO>): Promise<CustomerDTO> {
    const { data: updated, error } = await supabase
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

    if (error) throw new Error(`Failed to update customer: ${error.message}`);
    
    return CustomerService.mapToDTO(updated);
  }

  private static mapToDTO(entity: any): CustomerDTO {
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

export const customerService = new CustomerService();
