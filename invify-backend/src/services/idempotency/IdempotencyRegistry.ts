import { supabaseAdmin } from '../../db/supabase';
import { BuildVariantService } from '../../config/build-variant';

/**
 * Tenant-scoped payment / financial idempotency registry.
 *
 * Production table: public.payment_idempotency_keys
 * Unique constraint: (tenant_id, operation, idempotency_key)
 *
 * Mock mode is used only for LOCAL/test when IDEMPOTENCY_USE_MOCK=true
 * or when BUILD_VARIANT=LOCAL and no DB is configured.
 */
export interface IdempotencyKeyRecord {
  id: string;
  tenant_id: string;
  operation: string;
  idempotency_key: string;
  request_path?: string;
  request_hash: string | null;
  response_status: number | null;
  response_body: any | null;
  result_reference?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  expires_at: string;
  created_at: string;
}

export interface ExecutionLease {
  id: string;
  resource_id: string;
  owner_id: string;
  status: 'HELD' | 'RELEASED';
  expires_at: string;
  created_at: string;
}

function shouldUseMock(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  if (process.env.IDEMPOTENCY_USE_MOCK === 'true') return true;
  if (process.env.IDEMPOTENCY_USE_MOCK === 'false') return false;
  try {
    return BuildVariantService.getInstance().isLocal();
  } catch {
    return true;
  }
}

export class IdempotencyRegistry {
  private static mockKeys: IdempotencyKeyRecord[] = [];
  private static mockLeases: ExecutionLease[] = [];

  static clearMockData() {
    this.mockKeys = [];
    this.mockLeases = [];
  }

  /** Returns all in-memory idempotency key records (used by ops-center monitors). */
  static getMockKeys(): IdempotencyKeyRecord[] {
    return this.mockKeys;
  }

  /** Returns all in-memory execution leases (used by ops-center monitors). */
  static getMockLeases(): ExecutionLease[] {
    return this.mockLeases;
  }

  /**
   * Lookup by tenant + operation + key (preferred).
   * Legacy getKey(key) without tenant is unsafe for multi-tenant use.
   */
  static async getKeyScoped(
    tenantId: string,
    operation: string,
    key: string,
  ): Promise<IdempotencyKeyRecord | null> {
    if (shouldUseMock()) {
      return (
        this.mockKeys.find(
          (k) =>
            k.tenant_id === tenantId &&
            k.operation === operation &&
            k.idempotency_key === key,
        ) || null
      );
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('payment_idempotency_keys')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('operation', operation)
        .eq('idempotency_key', key)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch {
      return null;
    }
  }

  /** @deprecated Prefer getKeyScoped — global key lookup is not tenant-safe. */
  static async getKey(key: string): Promise<IdempotencyKeyRecord | null> {
    if (shouldUseMock()) {
      return this.mockKeys.find((k) => k.idempotency_key === key) || null;
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('payment_idempotency_keys')
        .select('*')
        .eq('idempotency_key', key)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch {
      return this.mockKeys.find((k) => k.idempotency_key === key) || null;
    }
  }

  static async insertKey(record: Partial<IdempotencyKeyRecord>): Promise<IdempotencyKeyRecord> {
    if (!record.tenant_id) {
      throw new Error('[IdempotencyRegistry] tenant_id is required');
    }
    if (!record.operation) {
      throw new Error('[IdempotencyRegistry] operation is required');
    }
    if (!record.idempotency_key) {
      throw new Error('[IdempotencyRegistry] idempotency_key is required');
    }

    const item: IdempotencyKeyRecord = {
      id: record.id || Math.random().toString(36).substring(2),
      tenant_id: record.tenant_id,
      operation: record.operation,
      idempotency_key: record.idempotency_key,
      request_path: record.request_path || '',
      request_hash: record.request_hash ?? null,
      response_status: record.response_status !== undefined ? record.response_status : null,
      response_body: record.response_body !== undefined ? record.response_body : null,
      result_reference: record.result_reference ?? null,
      status: record.status || 'PENDING',
      expires_at: record.expires_at || new Date(Date.now() + 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };

    if (shouldUseMock()) {
      const existing = this.mockKeys.find(
        (k) =>
          k.tenant_id === item.tenant_id &&
          k.operation === item.operation &&
          k.idempotency_key === item.idempotency_key,
      );
      if (existing) {
        const err: any = new Error('duplicate idempotency key');
        err.code = '23505';
        err.existing = existing;
        throw err;
      }
      this.mockKeys.push(item);
      return item;
    }

    const { data, error } = await supabaseAdmin
      .from('payment_idempotency_keys')
      .insert({
        tenant_id: item.tenant_id,
        operation: item.operation,
        idempotency_key: item.idempotency_key,
        request_hash: item.request_hash,
        response_status: item.response_status,
        response_body: item.response_body,
        result_reference: item.result_reference,
        status: item.status,
        expires_at: item.expires_at,
      })
      .select()
      .single();

    if (error) {
      const err: any = new Error(error.message);
      err.code = (error as any).code || '23505';
      throw err;
    }
    return data as IdempotencyKeyRecord;
  }

  static async updateKeyScoped(
    tenantId: string,
    operation: string,
    key: string,
    updates: Partial<IdempotencyKeyRecord>,
  ): Promise<void> {
    if (shouldUseMock()) {
      const idx = this.mockKeys.findIndex(
        (k) =>
          k.tenant_id === tenantId &&
          k.operation === operation &&
          k.idempotency_key === key,
      );
      if (idx !== -1) {
        this.mockKeys[idx] = { ...this.mockKeys[idx], ...updates };
      }
      return;
    }
    const { error } = await supabaseAdmin
      .from('payment_idempotency_keys')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('operation', operation)
      .eq('idempotency_key', key);
    if (error) throw error;
  }

  /** @deprecated Prefer updateKeyScoped */
  static async updateKey(key: string, updates: Partial<IdempotencyKeyRecord>): Promise<void> {
    if (shouldUseMock()) {
      const idx = this.mockKeys.findIndex((k) => k.idempotency_key === key);
      if (idx !== -1) {
        this.mockKeys[idx] = { ...this.mockKeys[idx], ...updates };
      }
      return;
    }
    const { error } = await supabaseAdmin
      .from('payment_idempotency_keys')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('idempotency_key', key);
    if (error) {
      const idx = this.mockKeys.findIndex((k) => k.idempotency_key === key);
      if (idx !== -1) {
        this.mockKeys[idx] = { ...this.mockKeys[idx], ...updates };
      }
    }
  }

  // --- Leases (still mock-first; durable leases tracked for Phase 4/5) ---
  static async getLease(resourceId: string): Promise<ExecutionLease | null> {
    return this.mockLeases.find((l) => l.resource_id === resourceId) || null;
  }

  static async insertOrUpdateLease(lease: Partial<ExecutionLease>): Promise<ExecutionLease> {
    const resourceId = lease.resource_id!;
    const item: ExecutionLease = {
      id: lease.id || Math.random().toString(36).substring(2),
      resource_id: resourceId,
      owner_id: lease.owner_id!,
      status: lease.status || 'HELD',
      expires_at: lease.expires_at || new Date(Date.now() + 10000).toISOString(),
      created_at: new Date().toISOString(),
    };

    const idx = this.mockLeases.findIndex((l) => l.resource_id === resourceId);
    if (idx !== -1) {
      this.mockLeases[idx] = { ...this.mockLeases[idx], ...lease, expires_at: item.expires_at };
      return this.mockLeases[idx];
    }
    this.mockLeases.push(item);
    return item;
  }

  static async deleteLease(resourceId: string): Promise<void> {
    this.mockLeases = this.mockLeases.filter((l) => l.resource_id !== resourceId);
  }
}
