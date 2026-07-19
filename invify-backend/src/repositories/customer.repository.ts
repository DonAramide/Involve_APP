import { PoolClient } from 'pg';
import { supabase } from '../db/supabase';
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
  }): Promise<{ data: any[], total: number, page: number, pageSize: number }>;
  
  getById(tenantId: string, customerId: string): Promise<any>;
}

export class CustomerRepository implements ICustomerRepository {
  static async upsert(client: PoolClient, params: {
    id: string;
    tenantId: string;
    name: string;
    phone?: string;
    address?: string;
    createdAt?: string;
  }) {
    const query = `
      INSERT INTO customers (id, tenant_id, name, phone, address, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          updated_at = NOW()
    `;
    await client.query(query, [
      params.id,
      params.tenantId,
      params.name,
      params.phone || null,
      params.address || null,
      params.createdAt || new Date().toISOString()
    ]);
  }

  async search(tenantId: string, options: { 
    page?: number; 
    pageSize?: number; 
    search?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    status?: CustomerStatus;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.dateFrom) {
      query = query.gte('created_at', options.dateFrom);
    }
    if (options.dateTo) {
      query = query.lte('created_at', options.dateTo);
    }
    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,phone.ilike.%${options.search}%`);
    }

    const sortField = options.sort || 'name';
    const ascending = options.direction !== 'desc';

    const { data, count, error } = await query
      .order(sortField, { ascending })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.warn(`[CustomerRepository] Search warning (possibly missing table): ${error.message}`);
      return { data: [], total: 0, page, pageSize };
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize
    };
  }

  async getById(tenantId: string, customerId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', customerId)
      .single();

    if (error) return null;
    return data;
  }
}
