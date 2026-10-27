import { supabaseAdmin } from '../db/supabase';
import { CatalogSchemaUnavailableError } from './catalog-store';

export function isCatalogTestRuntime(): boolean {
  return typeof process.env.JEST_WORKER_ID !== 'undefined' || process.env.NODE_ENV === 'test';
}

function missingSchema(error: { message?: string; code?: string } | null | undefined): boolean {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the function') ||
    error?.code === '42P01' ||
    error?.code === '42703' ||
    error?.code === '42883'
  );
}

/** Production publication. Requires unapplied proposal RPC. Never called from tests. */
export async function publishCatalogLive(params: {
  tenantId: string;
  idempotencyKey?: string;
  entityType: string;
  entityId: string;
  op: string;
  item?: Record<string, unknown> | null;
  category?: Record<string, unknown> | null;
  priceChanges?: unknown[];
  payload: Record<string, unknown>;
  changedBy?: string | null;
}): Promise<any> {
  const { data, error } = await supabaseAdmin.rpc('publish_catalog_mutation', {
    p_tenant_id: params.tenantId,
    p_idempotency_key: params.idempotencyKey || null,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId,
    p_op: params.op,
    p_item: params.item || null,
    p_category: params.category || null,
    p_price_changes: params.priceChanges || [],
    p_payload: params.payload,
    p_changed_by: params.changedBy || null,
  });
  if (error) {
    if (missingSchema(error)) throw new CatalogSchemaUnavailableError(error.message);
    const err: any = new Error(error.message);
    err.status = 400;
    throw err;
  }
  return data;
}

export async function readCatalogChangesLive(tenantId: string, sinceVersion: number) {
  const { data, error } = await supabaseAdmin
    .from('catalog_change_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .gt('catalog_version', sinceVersion)
    .order('catalog_version', { ascending: true });
  if (error) {
    if (missingSchema(error)) throw new CatalogSchemaUnavailableError(error.message);
    throw error;
  }
  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .select('catalog_version')
    .eq('id', tenantId)
    .maybeSingle();
  if (tenantErr && missingSchema(tenantErr)) throw new CatalogSchemaUnavailableError(tenantErr.message);
  return {
    catalog_version: Number(tenant?.catalog_version || 0),
    changes: data || [],
  };
}

export async function ackCatalogDeviceLive(row: {
  tenant_id: string;
  device_id: string;
  last_applied_version: number;
  last_sync_at: string;
  last_acknowledged_at: string;
  sync_status: string;
  last_error: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from('device_catalog_sync_state')
    .upsert(row, { onConflict: 'tenant_id,device_id' })
    .select()
    .single();
  if (error) {
    if (missingSchema(error)) throw new CatalogSchemaUnavailableError(error.message);
    throw error;
  }
  return data;
}

export async function listCatalogDeviceSyncLive(tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from('device_catalog_sync_state')
    .select('*')
    .eq('tenant_id', tenantId);
  if (error) {
    if (missingSchema(error)) throw new CatalogSchemaUnavailableError(error.message);
    throw error;
  }
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('catalog_version')
    .eq('id', tenantId)
    .maybeSingle();
  return {
    catalog_version: Number(tenant?.catalog_version || 0),
    devices: data || [],
  };
}
