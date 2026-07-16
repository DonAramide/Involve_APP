import { ICustomerRepository } from '../repositories/customer.repository';
import { CustomerDTO, CustomerProfileDTO, CustomerSearchResponseDTO, CustomerStatus } from '../types/customer.dto';
export declare class CustomerService {
    private repository;
    constructor(repository?: ICustomerRepository);
    searchCustomers(tenantId: string, options: {
        page?: number;
        pageSize?: number;
        search?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
        status?: CustomerStatus;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<CustomerSearchResponseDTO>;
    getCustomerSummary(tenantId: string, customerId: string): Promise<CustomerProfileDTO | null>;
    createCustomer(tenantId: string, data: Partial<CustomerDTO>): Promise<CustomerDTO>;
    updateCustomer(tenantId: string, customerId: string, data: Partial<CustomerDTO>): Promise<CustomerDTO>;
    private static mapToDTO;
}
export declare const customerService: CustomerService;
