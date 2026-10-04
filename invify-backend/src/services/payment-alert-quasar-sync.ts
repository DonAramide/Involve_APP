import { supabaseAdmin } from '../db/supabase';
import { QfsQuasarBridgeService } from './qfs-quasar-bridge.service';
import { QuasarApiClient } from '../integrations/quasar/quasar-api.client';
import { PaymentAlertTrailService } from './payment-alert-trail.service';
import { isQuasarCreditEntry, quasarLedgerAmountNaira } from '../utils/quasar-resync';
import { FeeShadowIntegration } from './fee-shadow-integration';
import { LedgerService } from './ledger.service';
import { WalletService } from './wallet.service';
import { roundNaira } from '../utils/virtual-account-funds';

function connectedTenantIds(io: any): string[] {
  const rooms = io?.sockets?.adapter?.rooms;
  if (!rooms || typeof rooms.keys !== 'function') return [];
  const ids: string[] = [];
  for (const key of rooms.keys()) {
    const name = String(key);
    if (name.startsWith('tenant:')) ids.push(name.slice('tenant:'.length));
  }
  return ids;
}

/** Device sync used to log the gross credit without a tenant wallet, so the fee debit had nowhere to land. */
async function postSyncedCreditToWallet(tenantId: string, reference: string, amountNaira: number) {
  const creditAmount = roundNaira(amountNaira);
  if (!tenantId || !reference || !(creditAmount > 0)) return;
  await WalletService.ensureWallet(tenantId);
  const idempotencyKey = `quasar:${reference}:credit`;
  if (await LedgerService.exists(idempotencyKey)) return;
  await LedgerService.createDoubleEntry({
    idempotencyKey,
    tenantId,
    reference,
    entries: [
      { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: creditAmount },
      { account: 'USER_WALLET', type: 'CREDIT', amount: creditAmount },
    ],
    actorId: 'SYSTEM_DEVICE_SYNC',
    provider: 'quasar',
    metadata: { source: 'quasar_socket_sync', type: 'deposit' },
  });
}

function ledgerReference(entry: any): string {
  return String(entry?.id || entry?.ledgerEntryId || '').trim();
}

let syncBusy = false;
let nextSyncAt = 0;
const SYNC_GAP_MS = 3_000;
const RATE_LIMIT_GAP_MS = 60_000;

/** Pull new Quasar credits for schools whose tablet is online and emit one socket alert. */
export async function syncConnectedTenantCredits(io: any): Promise<number> {
  if (syncBusy || Date.now() < nextSyncAt) return 0;
  syncBusy = true;
  nextSyncAt = Date.now() + SYNC_GAP_MS;
  try {
    return await syncConnectedTenantCreditsOnce(io);
  } finally {
    syncBusy = false;
  }
}

async function syncConnectedTenantCreditsOnce(io: any): Promise<number> {
  const tenantIds = connectedTenantIds(io);
  let sent = 0;
  for (const tenantId of tenantIds) {
    QuasarApiClient.resetCircuit();
    const { data: entities } = await supabaseAdmin
      .from('school_entities')
      .select('payload')
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'quasar_virtual_account')
      .limit(30);
    for (const entity of entities || []) {
      const payload = entity.payload && typeof entity.payload === 'object' ? entity.payload : {};
      const accountId = String((payload as any).quasarAccountId || '').trim();
      const va = String((payload as any).accountNumber || '').trim();
      if (!accountId) continue;
      let ledger: any[] = [];
      try {
        const raw = await QfsQuasarBridgeService.getLedger(tenantId, accountId, 15, 0, { noRetry: true, timeoutMs: 8000 });
        ledger = Array.isArray(raw) ? raw : [];
      } catch (err: any) {
        const message = String(err?.message || err);
        if (message.toLowerCase().includes('rate limit') || message.includes('429')) {
          nextSyncAt = Date.now() + RATE_LIMIT_GAP_MS;
          console.warn(`[PaymentAlert] Quasar sync paused ${tenantId}:`, message);
          return sent;
        }
        console.warn(`[PaymentAlert] Quasar sync skipped ${tenantId}:`, message);
        continue;
      }
      for (const entry of ledger) {
        if (!isQuasarCreditEntry(entry)) continue;
        const amount = quasarLedgerAmountNaira(entry);
        const reference = ledgerReference(entry);
        if (!(amount > 0) || !reference) continue;
        const { data: existing } = await supabaseAdmin
          .from('payment_alert_deliveries')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('reference', reference)
          .maybeSingle();
        if (existing) continue;
        const sender = String(entry.narration || entry.reason || entry.description || 'Quasar').slice(0, 80);
        const { data: txn } = await supabaseAdmin
          .from('transactions_log')
          .select('id')
          .eq('reference', reference)
          .maybeSingle();
        if (!txn) {
          await supabaseAdmin.from('transactions_log').insert({
            reference,
            tenant_id: tenantId,
            amount: Math.round(amount),
            type: 'CREDIT',
            provider: 'quasar',
            status: 'SUCCESS',
            metadata: {
              virtualAccountNumber: va || null,
              accountNumber: va || null,
              senderName: sender,
              studentName: sender,
              amountNaira: amount,
              sandbox: true,
              source: 'quasar_socket_sync',
            },
          });
        }
        await PaymentAlertTrailService.recordAndEmit(io, {
          tenantId,
          reference,
          amount,
          payload: {
            metadata: {
              virtualAccountNumber: va || null,
              accountNumber: va || null,
              senderName: sender,
              studentName: sender,
              sandbox: true,
            },
          },
        });
        try {
          await postSyncedCreditToWallet(tenantId, reference, amount);
          await FeeShadowIntegration.afterVaInwardResult(true, {
            tenantId,
            amountNaira: amount,
            reference,
            eventTime: new Date(),
          });
        } catch (feeErr: any) {
          console.warn(`[PaymentAlert] VA fee skipped ${reference}:`, feeErr?.message || feeErr);
        }
        sent += 1;
      }
    }
  }
  if (sent) console.log(`[PaymentAlert] synced ${sent} new Quasar credit(s)`);
  return sent;
}

export async function listPaymentAlerts(limit = 100) {
  const { data, error } = await supabaseAdmin
    .from('payment_alert_deliveries')
    .select('id, tenant_id, reference, amount, status, attempts, payload, created_at, last_attempt_at, delivered_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const tenantIds = [...new Set((data || []).map((row) => String(row.tenant_id)))];
  const { data: tenants } = await supabaseAdmin.from('tenants').select('id, name').in('id', tenantIds.length ? tenantIds : ['00000000-0000-0000-0000-000000000000']);
  const names = new Map((tenants || []).map((row) => [String(row.id), row.name]));
  return (data || []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: names.get(String(row.tenant_id)) || row.tenant_id,
    reference: row.reference,
    amount: Number(row.amount),
    status: row.status,
    attempts: row.attempts,
    sender: row.payload?.metadata?.senderName || row.payload?.metadata?.studentName || null,
    accountNumber: row.payload?.metadata?.accountNumber || row.payload?.metadata?.virtualAccountNumber || null,
    createdAt: row.created_at,
    lastAttemptAt: row.last_attempt_at,
    deliveredAt: row.delivered_at,
  }));
}

export async function repushPaymentAlert(id: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('payment_alert_deliveries')
    .update({
      status: 'pending',
      attempts: 0,
      next_attempt_at: now,
      delivered_at: null,
      updated_at: now,
    })
    .eq('id', id)
    .select('id, reference, amount, tenant_id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw Object.assign(new Error('Payment alert not found'), { status: 404 });
  return data;
}
