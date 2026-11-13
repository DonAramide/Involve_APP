import { PoolClient } from 'pg';
import { CustomerStatus } from '../types/customer.dto';
export interface ICustomerRepository {
    search(tenantId: string, options: {
        page?: number;
        pageSize?: number;
        search?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
        status?: CustomerStatus;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(tenantId: string, customerId: string): Promise<any>;
}
export declare class CustomerRepository implements ICustomerRepository {
    static upsert(client: PoolClient, params: {
        id: string;
        tenantId: string;
        name: string;
        phone?: string;
        address?: string;
        createdAt?: string;
    }): Promise<void>;
    search(tenantId: string, options: {
        page?: number;
        pageSize?: number;
        search?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
        status?: CustomerStatus;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getById(tenantId: string, customerId: string): Promise<any>;
}
