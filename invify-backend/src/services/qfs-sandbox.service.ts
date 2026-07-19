// src/services/qfs-sandbox.service.ts
// Core QFS Financial Sandbox service.
// Handles: accounts, ledger, transfers, config, audit, PSP simulation.

import crypto from 'crypto';
import { supabaseAdmin } from '../db/supabase';

// ── Sandbox Bank Catalog ──────────────────────────────────────────────────────
export const SANDBOX_BANKS = [
  { code: '999', name: 'Quasar Test Bank',       shortName: 'QTB',  nip: false },
  { code: '058', name: 'Guaranty Trust Bank',     shortName: 'GTB',  nip: true  },
  { code: '011', name: 'First Bank of Nigeria',   shortName: 'FBN',  nip: true  },
  { code: '057', name: 'Zenith Bank',             shortName: 'ZNB',  nip: true  },
  { code: '033', name: 'United Bank for Africa',  shortName: 'UBA',  nip: true  },
  { code: '044', name: 'Access Bank',             shortName: 'ACB',  nip: true  },
  { code: '039', name: 'Stanbic IBTC Bank',       shortName: 'STB',  nip: true  },
  { code: '014', name: 'Heritage Bank',           shortName: 'HTB',  nip: true  },
  { code: '215', name: 'Unity Bank',              shortName: 'UNB',  nip: true  },
  { code: '232', name: 'Sterling Bank',           shortName: 'SLB',  nip: true  },
  { code: '035', name: 'Wema Bank',               shortName: 'WMA',  nip: true  },
  { code: '032', name: 'Union Bank of Nigeria',   shortName: 'UBN',  nip: true  },
];

// ── PSP Simulator Catalog ─────────────────────────────────────────────────────
export const PSP_PROVIDERS = {
  QUASAR: {
    name: 'Quasar Bank',
    signatureHeader: 'x-quasar-signature',
    algorithm: 'HMAC-SHA256',
    webhookEvents: ['transfer.success', 'transfer.failed', 'credit.received'],
    delayMsMin: 50, delayMsMax: 300,
  },
  PAYSTACK: {
    name: 'Paystack',
    signatureHeader: 'x-paystack-signature',
    algorithm: 'HMAC-SHA512',
    webhookEvents: ['charge.success', 'transfer.success', 'transfer.failed'],
    delayMsMin: 100, delayMsMax: 800,
  },
  MONNIFY: {
    name: 'Monnify',
    signatureHeader: 'monnify-signature',
    algorithm: 'HMAC-SHA512',
    webhookEvents: ['SUCCESSFUL_TRANSACTION', 'FAILED_TRANSACTION'],
    delayMsMin: 150, delayMsMax: 600,
  },
  FLUTTERWAVE: {
    name: 'Flutterwave',
    signatureHeader: 'verif-hash',
    algorithm: 'HMAC-SHA256',
    webhookEvents: ['charge.completed', 'transfer.completed'],
    delayMsMin: 100, delayMsMax: 500,
  },
  NIBSS: {
    name: 'NIBSS',
    signatureHeader: 'x-nip-signature',
    algorithm: 'HMAC-SHA256',
    webhookEvents: ['nip.credit', 'nip.debit'],
    delayMsMin: 200, delayMsMax: 1200,
  },
};

// ── Transaction Profiles ──────────────────────────────────────────────────────
export const TRANSACTION_PROFILES = [
  { id: 'retail_pos_sale',    label: 'Retail POS Sale',         amount: 150000,  narration: 'POS Sale',           provider: 'QUASAR' },
  { id: 'wallet_topup',       label: 'Wallet Top-Up',           amount: 500000,  narration: 'Wallet Funding',     provider: 'PAYSTACK' },
  { id: 'bulk_salary',        label: 'Bulk Salary Disbursement', amount: 5000000, narration: 'Salary Payment',     provider: 'QUASAR' },
  { id: 'event_ticket',       label: 'Event Ticket Purchase',   amount: 25000,   narration: 'Ticket Sale',        provider: 'FLUTTERWAVE' },
  { id: 'school_fees',        label: 'School Fees Payment',     amount: 1200000, narration: 'School Fees',        provider: 'MONNIFY' },
  { id: 'inter_bank_transfer',label: 'Inter-Bank Transfer',     amount: 300000,  narration: 'Transfer via NIP',   provider: 'NIBSS' },
  { id: 'micro_credit',       label: 'Micro Credit Repayment',  amount: 50000,   narration: 'Loan Repayment',     provider: 'PAYSTACK' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateAccountNumber(): string {
  // 900-prefix test VAs
  return '900' + Math.floor(Math.random() * 9_000_000 + 1_000_000).toString();
}

function generateReference(): string {
  return 'SBX-' + crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
}

function signPayload(payload: string, secret: string, algorithm: 'SHA256' | 'SHA512' = 'SHA256'): string {
  return crypto.createHmac(`sha${algorithm === 'SHA256' ? '256' : '512'}`, secret)
    .update(payload).digest('hex');
}

async function auditLog(tenantId: string, action: string, entityType: string, entityId: string | null, actor: string, meta: any = {}) {
  await supabaseAdmin.from('qfs_sandbox_audit_logs').insert({
    tenant_id: tenantId, actor, action, entity_type: entityType,
    entity_id: entityId, meta
  });
}

// ── QFS Sandbox Service ───────────────────────────────────────────────────────
export class QfsSandboxService {

  // ── Session Info ────────────────────────────────────────────────────────────
  static async getSession(tenantId: string, keyId: string) {
    const { data: tenant } = await supabaseAdmin.from('tenants').select('id, name, business_type').eq('id', tenantId).single();
    const { count } = await supabaseAdmin.from('qfs_sandbox_accounts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId);
    return {
      tenantId,
      tenantName: tenant?.name || 'Unknown',
      businessType: tenant?.business_type,
      environment: 'test',
      keyId,
      accountCount: count || 0,
    };
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  static async bootstrap(tenantId: string, webhookUrl: string, socketChannel?: string) {
    const secret = crypto.randomBytes(32).toString('hex');
    const { data: existing } = await supabaseAdmin.from('qfs_sandbox_config').select('id').eq('tenant_id', tenantId).single();
    if (existing) {
      await supabaseAdmin.from('qfs_sandbox_config').update({ webhook_url: webhookUrl, socket_channel: socketChannel || null, webhook_secret_enc: secret }).eq('tenant_id', tenantId);
    } else {
      await supabaseAdmin.from('qfs_sandbox_config').insert({ tenant_id: tenantId, webhook_url: webhookUrl, socket_channel: socketChannel || null, webhook_secret_enc: secret });
    }
    await auditLog(tenantId, 'BOOTSTRAP', 'sandbox_config', null, 'api_key');
    return { webhookUrl, socketChannel: socketChannel || null, sandboxSecretKey: secret, note: 'Copy sandboxSecretKey to your .env as QUASAR_WEBHOOK_SECRET. It will not be shown again.' };
  }

  // ── Config ──────────────────────────────────────────────────────────────────
  static async getConfig(tenantId: string) {
    const { data } = await supabaseAdmin.from('qfs_sandbox_config').select('webhook_url, socket_channel, chaos_mode, created_at, updated_at').eq('tenant_id', tenantId).single();
    if (!data) return { configured: false };
    return { configured: true, webhookUrl: data.webhook_url, socketChannel: data.socket_channel, secretConfigured: true, chaosMode: data.chaos_mode, updatedAt: data.updated_at };
  }

  static async updateConfig(tenantId: string, patch: { webhookUrl?: string; socketChannel?: string; chaosMode?: any }) {
    const update: any = { updated_at: new Date().toISOString() };
    if (patch.webhookUrl !== undefined) update.webhook_url = patch.webhookUrl;
    if (patch.socketChannel !== undefined) update.socket_channel = patch.socketChannel;
    if (patch.chaosMode !== undefined) update.chaos_mode = patch.chaosMode;
    await supabaseAdmin.from('qfs_sandbox_config').upsert({ tenant_id: tenantId, ...update });
    return { updated: true };
  }

  static async generateSecret(tenantId: string) {
    const secret = crypto.randomBytes(32).toString('hex');
    await supabaseAdmin.from('qfs_sandbox_config').upsert({ tenant_id: tenantId, webhook_secret_enc: secret, updated_at: new Date().toISOString() });
    await auditLog(tenantId, 'GENERATE_SECRET', 'sandbox_config', null, 'api_key');
    return { sandboxSecretKey: secret, note: 'This secret is shown once. Store it as QUASAR_WEBHOOK_SECRET.' };
  }

  // ── Banks ───────────────────────────────────────────────────────────────────
  static getBanks() { return SANDBOX_BANKS; }

  static lookupBanks(q?: string, code?: string) {
    let banks = SANDBOX_BANKS;
    if (code) return banks.filter(b => b.code === code);
    if (q)    return banks.filter(b => b.name.toLowerCase().includes(q.toLowerCase()) || b.shortName.toLowerCase().includes(q.toLowerCase()));
    return banks;
  }

  // ── Accounts ────────────────────────────────────────────────────────────────
  static async generateAccounts(tenantId: string, accountName: string, count: number = 1, bankCode?: string, bankName?: string) {
    const bank = bankCode ? SANDBOX_BANKS.find(b => b.code === bankCode) : SANDBOX_BANKS[0];
    const accounts = [];
    for (let i = 0; i < Math.min(count, 10); i++) {
      const accountNumber = generateAccountNumber();
      const { data, error } = await supabaseAdmin.from('qfs_sandbox_accounts').insert({
        tenant_id: tenantId,
        account_number: accountNumber,
        account_name: accountName + (count > 1 ? ` ${i + 1}` : ''),
        bank_code: bank?.code || bankCode || '999',
        bank_name: bank?.name || bankName || 'Quasar Test Bank',
        currency: 'NGN',
        balance_kobo: 0,
      }).select().single();
      if (!error && data) {
        accounts.push(data);
        await auditLog(tenantId, 'GENERATE_ACCOUNT', 'qfs_sandbox_accounts', data.id, 'api_key', { accountNumber, bankCode: bank?.code });
      }
    }
    return accounts;
  }

  static async listAccounts(tenantId: string) {
    const { data } = await supabaseAdmin.from('qfs_sandbox_accounts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    return data || [];
  }

  static async getAccount(tenantId: string, id: string) {
    const { data, error } = await supabaseAdmin.from('qfs_sandbox_accounts').select('*').eq('id', id).eq('tenant_id', tenantId).single();
    if (error || !data) throw new Error('Account not found');
    return data;
  }

  // ── Credit / Debit ──────────────────────────────────────────────────────────
  static async credit(tenantId: string, accountId: string, amountKobo: number, reason: string = 'Manual Credit', currency: string = 'NGN', correlationId?: string) {
    const account = await this.getAccount(tenantId, accountId);
    const newBalance = account.balance_kobo + amountKobo;
    await supabaseAdmin.from('qfs_sandbox_accounts').update({ balance_kobo: newBalance, updated_at: new Date().toISOString() }).eq('id', accountId);
    const reference = generateReference();
    const { data: entry } = await supabaseAdmin.from('qfs_sandbox_ledger').insert({
      account_id: accountId, tenant_id: tenantId, direction: 'credit',
      amount_kobo: amountKobo, balance_after: newBalance, currency, reason, reference,
      correlation_id: correlationId || crypto.randomUUID(),
    }).select().single();
    // Snapshot balance
    await supabaseAdmin.from('qfs_balance_snapshots').insert({ account_id: accountId, tenant_id: tenantId, balance_kobo: newBalance });
    await auditLog(tenantId, 'CREDIT', 'qfs_sandbox_accounts', accountId, 'api_key', { amountKobo, reference });
    return { accountId, reference, amountKobo, balanceAfterKobo: newBalance, ledgerEntryId: entry?.id };
  }

  static async debit(tenantId: string, accountId: string, amountKobo: number, reason: string = 'Manual Debit', currency: string = 'NGN', correlationId?: string) {
    const account = await this.getAccount(tenantId, accountId);
    if (account.balance_kobo < amountKobo) throw new Error('Insufficient balance');
    const newBalance = account.balance_kobo - amountKobo;
    await supabaseAdmin.from('qfs_sandbox_accounts').update({ balance_kobo: newBalance, updated_at: new Date().toISOString() }).eq('id', accountId);
    const reference = generateReference();
    await supabaseAdmin.from('qfs_sandbox_ledger').insert({
      account_id: accountId, tenant_id: tenantId, direction: 'debit',
      amount_kobo: amountKobo, balance_after: newBalance, currency, reason, reference,
      correlation_id: correlationId || crypto.randomUUID(),
    });
    await supabaseAdmin.from('qfs_balance_snapshots').insert({ account_id: accountId, tenant_id: tenantId, balance_kobo: newBalance });
    await auditLog(tenantId, 'DEBIT', 'qfs_sandbox_accounts', accountId, 'api_key', { amountKobo, reference });
    return { accountId, reference, amountKobo, balanceAfterKobo: newBalance };
  }

  // ── Ledger ──────────────────────────────────────────────────────────────────
  static async getLedger(tenantId: string, accountId: string, limit = 50, offset = 0) {
    // Verify ownership
    await this.getAccount(tenantId, accountId);
    const { data } = await supabaseAdmin.from('qfs_sandbox_ledger').select('*').eq('account_id', accountId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return data || [];
  }

  static async getBalanceSnapshots(tenantId: string, accountId: string, limit = 30) {
    await this.getAccount(tenantId, accountId);
    const { data } = await supabaseAdmin.from('qfs_balance_snapshots').select('*').eq('account_id', accountId).order('snapshot_at', { ascending: false }).limit(limit);
    return data || [];
  }

  // ── Transfers ───────────────────────────────────────────────────────────────
  static async createTransfer(tenantId: string, body: any) {
    const correlationId = body.correlationId || crypto.randomUUID();
    const reference = generateReference();
    const { data, error } = await supabaseAdmin.from('qfs_sandbox_transfers').insert({
      tenant_id: tenantId,
      from_account_id: body.fromAccountId || null,
      to_account_id: body.toAccountId || null,
      amount_kobo: body.amountKobo,
      currency: body.currency || 'NGN',
      reference,
      narration: body.narration,
      status: 'pending',
      provider: body.provider || 'QUASAR',
      profile_id: body.profileId || null,
      correlation_id: correlationId,
      metadata: body.metadata || null,
    }).select().single();
    if (error) throw new Error(error.message);
    await auditLog(tenantId, 'CREATE_TRANSFER', 'qfs_sandbox_transfers', data.id, 'api_key', { amountKobo: body.amountKobo });
    return data;
  }

  static async generateTransfer(tenantId: string, profileId: string) {
    const profile = TRANSACTION_PROFILES.find(p => p.id === profileId);
    if (!profile) throw new Error(`Unknown profile: ${profileId}`);
    const accounts = await this.listAccounts(tenantId);
    return this.createTransfer(tenantId, {
      amountKobo: profile.amount, narration: profile.narration,
      provider: profile.provider, profileId,
      fromAccountId: accounts[0]?.id || null,
    });
  }

  static async listTransfers(tenantId: string, limit = 50, offset = 0) {
    const { data } = await supabaseAdmin.from('qfs_sandbox_transfers').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return data || [];
  }

  static async getTransfer(tenantId: string, id: string) {
    const { data, error } = await supabaseAdmin.from('qfs_sandbox_transfers').select('*').eq('id', id).eq('tenant_id', tenantId).single();
    if (error || !data) throw new Error('Transfer not found');
    return data;
  }

  static async transitionTransfer(tenantId: string, id: string, action: 'approve' | 'reject' | 'reverse') {
    const transfer = await this.getTransfer(tenantId, id);
    const transitions: Record<string, string[]> = {
      approve: ['pending'], reject: ['pending', 'processing'], reverse: ['success'],
    };
    const newStatus = action === 'approve' ? 'success' : action === 'reject' ? 'rejected' : 'reversed';
    if (!transitions[action].includes(transfer.status)) {
      throw new Error(`Cannot ${action} a transfer in status: ${transfer.status}`);
    }
    if (action === 'approve' && transfer.from_account_id) {
      try { await this.debit(tenantId, transfer.from_account_id, transfer.amount_kobo, transfer.narration, transfer.currency, transfer.correlation_id); } catch {}
    }
    if (action === 'reverse' && transfer.from_account_id) {
      try { await this.credit(tenantId, transfer.from_account_id, transfer.amount_kobo, 'Transfer Reversal', transfer.currency, transfer.correlation_id); } catch {}
    }
    const { data } = await supabaseAdmin.from('qfs_sandbox_transfers').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    await auditLog(tenantId, action.toUpperCase(), 'qfs_sandbox_transfers', id, 'api_key');
    return data;
  }

  // ── Timeline ─────────────────────────────────────────────────────────────────
  static async getTimeline(tenantId: string, limit = 50) {
    const [ledger, transfers] = await Promise.all([
      supabaseAdmin.from('qfs_sandbox_ledger').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(limit),
      supabaseAdmin.from('qfs_sandbox_transfers').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(limit),
    ]);
    const events = [
      ...(ledger.data || []).map(e => ({ ...e, _type: 'ledger' })),
      ...(transfers.data || []).map(e => ({ ...e, _type: 'transfer' })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
    return events;
  }

  static async getTimelineByCorrelation(tenantId: string, correlationId: string) {
    const [ledger, transfers] = await Promise.all([
      supabaseAdmin.from('qfs_sandbox_ledger').select('*').eq('tenant_id', tenantId).eq('correlation_id', correlationId).order('created_at', { ascending: true }),
      supabaseAdmin.from('qfs_sandbox_transfers').select('*').eq('tenant_id', tenantId).eq('correlation_id', correlationId).order('created_at', { ascending: true }),
    ]);
    return {
      correlationId,
      ledgerEntries: ledger.data || [],
      transfers: transfers.data || [],
    };
  }

  // ── PSP Simulation ───────────────────────────────────────────────────────────
  static async simulateProvider(tenantId: string, provider: string, body: any) {
    const psp = PSP_PROVIDERS[provider.toUpperCase() as keyof typeof PSP_PROVIDERS];
    if (!psp) throw new Error(`Unknown provider: ${provider}. Valid: ${Object.keys(PSP_PROVIDERS).join(', ')}`);

    const correlationId = crypto.randomUUID();
    const amount = body.amount || 10000;
    const narration = body.narration || 'Sandbox simulation';
    const outcome = body.outcome || 'success';

    const payload: any = {
      event: outcome === 'success' ? (provider === 'QUASAR' ? 'transfer.success' : 'charge.success') : 'transfer.failed',
      schema_version: 1,
      id: crypto.randomUUID(),
      timestamp: Math.floor(Date.now() / 1000),
      occurred_at: new Date().toISOString(),
      data: { tenantId, correlationId, amount: amount.toString(), currency: 'NGN', narration, sandbox: true, outcome },
    };

    const payloadStr = JSON.stringify(payload);
    const { data: config } = await supabaseAdmin.from('qfs_sandbox_config').select('webhook_secret_enc').eq('tenant_id', tenantId).single();
    const secret = config?.webhook_secret_enc || 'sandbox-default-secret';
    const alg = psp.algorithm.includes('512') ? 'SHA512' : 'SHA256';
    const signature = signPayload(payloadStr, secret, alg);

    return {
      provider: provider.toUpperCase(),
      signatureHeader: psp.signatureHeader,
      signature,
      algorithm: psp.algorithm,
      payload,
      curlExample: `curl -s -X POST "<your-webhook-url>" \\\n  -H "Content-Type: application/json" \\\n  -H "${psp.signatureHeader}: ${signature}" \\\n  -d '${payloadStr}'`,
    };
  }

  // ── Audit Logs ───────────────────────────────────────────────────────────────
  static async getAuditLogs(tenantId: string, limit = 50, offset = 0) {
    const { data } = await supabaseAdmin.from('qfs_sandbox_audit_logs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return data || [];
  }
}
