import { supabaseAdmin } from '../db/supabase';
import {
  CatalogCategory,
  CatalogChangeEvent,
  CatalogItem,
  CatalogPriceHistory,
  CatalogSchemaUnavailableError,
  CatalogStore,
  DeviceCatalogSyncState,
  InvoiceLineSnapshot,
} from './catalog-store';

function isMissingSchema(error: { message?: string; code?: string } | null | undefined): boolean {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('catalog_version') ||
    msg.includes('catalog_change_events') ||
    error?.code === '42703' ||
    error?.code === '42P01'
  );
}

function throwSchema(error?: { message?: string }): never {
  throw new CatalogSchemaUnavailableError(error?.message);
}

/**
 * Production adapter. Prefers RPC `publish_catalog_mutation` (see DO_NOT_APPLY SQL)
 * so version + event + history commit together. Direct table writes are only used
 * for reads and acknowledgements.
 */
export class SupabaseCatalogStore implements CatalogStore {
  async runAtomic<T>(fn: () => T | Promise<T>): Promise<T> {
    return fn();
  }

  getTenantVersion(tenantId: string): number {
    throw new Error('Use async methods via CatalogService only after schema apply');
  }

  setTenantVersion(): void {
    throw new Error('Use RPC publish_catalog_mutation');
  }

  getItem(): CatalogItem | undefined {
    return undefined;
  }
  findItemBySku(): CatalogItem | undefined {
    return undefined;
  }
  listItems(): CatalogItem[] {
    return [];
  }
  upsertItem(): CatalogItem {
    throw new CatalogSchemaUnavailableError();
  }
  getCategory(): CatalogCategory | undefined {
    return undefined;
  }
  listCategories(): CatalogCategory[] {
    return [];
  }
  upsertCategory(): CatalogCategory {
    throw new CatalogSchemaUnavailableError();
  }
  appendEvent(): void {
    throw new CatalogSchemaUnavailableError();
  }
  listEventsSince(): CatalogChangeEvent[] {
    return [];
  }
  appendPriceHistory(): void {
    throw new CatalogSchemaUnavailableError();
  }
  listPriceHistory(): CatalogPriceHistory[] {
    return [];
  }
  getIdempotency() {
    return undefined;
  }
  putIdempotency(): void {}
  getDeviceSync() {
    return undefined;
  }
  listDeviceSync(): DeviceCatalogSyncState[] {
    return [];
  }
  upsertDeviceSync(row: DeviceCatalogSyncState): DeviceCatalogSyncState {
    return row;
  }
  listInvoiceLines(): InvoiceLineSnapshot[] {
    return [];
  }

  async readTenantVersion(tenantId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('catalog_version')
      .eq('id', tenantId)
      .maybeSingle();
    if (error) {
      if (isMissingSchema(error)) throwSchema(error);
      throw error;
    }
    return Number(data?.catalog_version || 0);
  }

  async readChanges(tenantId: string, sinceVersion: number): Promise<CatalogChangeEvent[]> {
    const { data, error } = await supabaseAdmin
      .from('catalog_change_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .gt('catalog_version', sinceVersion)
      .order('catalog_version', { ascending: true });
    if (error) {
      if (isMissingSchema(error)) throwSchema(error);
      throw error;
    }
    return (data || []) as CatalogChangeEvent[];
  }

  async ackDevice(row: DeviceCatalogSyncState): Promise<DeviceCatalogSyncState> {
    const { data, error } = await supabaseAdmin
      .from('device_catalog_sync_state')
      .upsert(row, { onConflict: 'tenant_id,device_id' })
      .select()
      .single();
    if (error) {
      if (isMissingSchema(error)) throwSchema(error);
      throw error;
    }
    return data as DeviceCatalogSyncState;
  }
}
