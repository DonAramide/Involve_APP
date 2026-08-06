// invify-backend/src/services/ledger.service.ts
import { supabase, supabaseAdmin } from "../db/supabase";
import { PoolClient } from "pg";

export type LedgerEntryType = "DEBIT" | "CREDIT";

export type LedgerAccount = 
  | "USER_WALLET"
  | "QUASAR_CLEARING"
  | "EXTERNAL_BANK"
  | "REVENUE"
  | "COMMISSIONS"
  | "TAXES"
  | "SETTLEMENTS"
  | "REFUNDS"
  | "CHARGEBACKS"
  | "ADJUSTMENTS";

export interface LedgerEntry {
  account: LedgerAccount;
  type: LedgerEntryType;
  amount: number; // Enforced as integer (kobo)
}

export class LedgerService {
  /**
   * Creates a double-entry ledger record.
   * Uses idempotent processing to prevent duplicate financial updates.
   */
  static async createDoubleEntry(params: {
    idempotencyKey: string;
    tenantId: string;
    reference: string;
    entries: LedgerEntry[];
    actorId?: string;
    correlationId?: string;
    requestId?: string;
    provider?: string;
    auditId?: string;
    metadata?: any;
  }, options?: { pgClient?: PoolClient }) {
    const { 
      idempotencyKey, tenantId, reference, entries, 
      actorId, correlationId, requestId, provider, auditId, metadata 
    } = params;

    const enrichedMetadata = {
      ...metadata,
      identity: { actorId, correlationId, requestId, provider, auditId }
    };

    // 1. Check for existing entry (Idempotency)
    const { data: existing } = await supabase
      .from('ledgers')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      console.log(`[Ledger] Duplicate event detected. Skipping: ${idempotencyKey}`);
      return { status: 'DE-DUPLICATED', id: existing.id };
    }

    // 2. Atomic Transaction: Write entries and the idempotency record
    // We use a database RPC / Function to ensure Atomicity.
    let data, error;
    if (options?.pgClient) {
      try {
        const query = 'SELECT process_ledger_double_entry($1::uuid, $2::varchar, $3::varchar, $4::jsonb, $5::jsonb) as result';
        const res = await options.pgClient.query(query, [tenantId, idempotencyKey, reference, JSON.stringify(entries), JSON.stringify(enrichedMetadata)]);
        data = res.rows[0]?.result;
      } catch (err: any) {
        error = err;
      }
    } else {
      const rpcRes = await supabaseAdmin.rpc('process_ledger_double_entry', {
        p_tenant_id: tenantId,
        p_idempotency_key: idempotencyKey,
        p_reference: reference,
        p_entries: entries,
        p_metadata: enrichedMetadata
      });
      data = rpcRes.data;
      error = rpcRes.error;
    }

    if (error) {
      console.error('[Ledger] Atomic Write Failed:', error.message);
      throw new Error(`Financial recording failure: ${error.message}`);
    }

    return { status: 'CREATED', data };
  }

  /**
   * Checks if an idempotency key has already been processed.
   */
  static async exists(idempotencyKey: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('ledgers')
      .select('id', { count: 'exact', head: true })
      .eq('idempotency_key', idempotencyKey);
    
    if (error) return false;
    return (count ?? 0) > 0;
  }
}
