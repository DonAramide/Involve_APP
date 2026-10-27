import { supabaseAdmin } from '../db/supabase';
import { QfsQuasarBridgeService } from './qfs-quasar-bridge.service';
import { QuasarApiClient } from '../integrations/quasar/quasar-api.client';
import { sandboxBalanceToNaira } from '../utils/virtual-account-funds';

const SYNC_TYPES = ['quasar_virtual_account', 'parent_virtual_account', 'parent'];

function accountFromPayload(payload: any): string {
  return String(
    payload?.accountNumber ||
      payload?.virtualAccountNumber ||
      payload?.virtual_account_number ||
      '',
  ).trim();
}

export async function refreshAllQuasarVirtualAccounts(): Promise<{
  tenants: number;
  accounts: number;
  saved: number;
  failed: Array<{ tenantId: string; tenantName: string | null; error: string }>;
}> {
  const { data: integrations, error } = await supabaseAdmin
    .from('quasar_integrations')
    .select('invify_tenant_id')
    .limit(500);
  if (error) throw new Error(error.message);

  const { data: tenantRows } = await supabaseAdmin.from('tenants').select('id, name').limit(500);
  const names = new Map<string, string>();
  for (const tenant of tenantRows || []) names.set(String(tenant.id), tenant.name);

  const seenTenants = new Set<string>();
  let accounts = 0;
  let saved = 0;
  const failed: Array<{ tenantId: string; tenantName: string | null; error: string }> = [];

  for (const integration of integrations || []) {
    const tenantId = String(integration.invify_tenant_id || '').trim();
    if (!tenantId || seenTenants.has(tenantId)) continue;
    seenTenants.add(tenantId);
    QuasarApiClient.resetCircuit();
    try {
      const live = (await QfsQuasarBridgeService.listAccounts(tenantId)) || [];
      for (const account of live) {
        const accountNumber = String(account.accountNumber || account.account_number || '').trim();
        if (!accountNumber) continue;
        accounts += 1;
        const payload = {
          accountNumber,
          accountName: account.accountName || account.account_name || accountNumber,
          bankName: account.bankName || account.bank_name || 'Quasar',
          status: account.status || (account.is_active === false ? 'INACTIVE' : 'ACTIVE'),
          quasarBalance: sandboxBalanceToNaira(account),
          quasarAccountId: account.id || null,
        };
        const { error: saveError } = await supabaseAdmin.from('school_entities').upsert(
          {
            tenant_id: tenantId,
            entity_type: 'quasar_virtual_account',
            sync_id: accountNumber,
            payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,entity_type,sync_id' },
        );
        if (saveError) throw new Error(saveError.message);
        saved += 1;
      }
    } catch (err: any) {
      failed.push({
        tenantId,
        tenantName: names.get(tenantId) || null,
        error: String(err?.message || err),
      });
    }
  }

  return { tenants: seenTenants.size, accounts, saved, failed };
}

export async function applySyncedVirtualAccounts(rows: any[], names: Map<string, { name: string; type: string }>) {
  const { data, error } = await supabaseAdmin
    .from('school_entities')
    .select('tenant_id, entity_type, payload')
    .in('entity_type', SYNC_TYPES)
    .limit(2000);
  if (error || !data) return rows;

  const byNumber = new Map<string, any>();
  for (const row of rows) {
    const number = String(row.accountNumber || '').trim();
    if (number) byNumber.set(number, row);
  }

  for (const entity of data) {
    const payload = entity.payload && typeof entity.payload === 'object' ? entity.payload : {};
    const accountNumber = accountFromPayload(payload);
    if (!accountNumber) continue;
    const quasarBalance = payload.quasarBalance;
    const existing = byNumber.get(accountNumber);
    if (existing) {
      if (quasarBalance != null && quasarBalance !== '') existing.quasarBalance = Number(quasarBalance);
      continue;
    }
    if (entity.entity_type !== 'quasar_virtual_account') continue;
    const tenantId = String(entity.tenant_id || '');
    const tenant = names.get(tenantId);
    const row = {
      id: `quasar:${accountNumber}`,
      tenantId,
      tenantName: tenant?.name || '—',
      tenantType: tenant?.type || '—',
      holderType: 'Quasar',
      holderName: payload.accountName || accountNumber,
      holderId: payload.quasarAccountId || null,
      accountNumber,
      bankName: payload.bankName || 'Quasar',
      accountName: payload.accountName || accountNumber,
      status: payload.status || 'ACTIVE',
      balance: 0,
      quasarBalance: quasarBalance == null || quasarBalance === '' ? null : Number(quasarBalance),
    };
    rows.push(row);
    byNumber.set(accountNumber, row);
  }
  return rows;
}
