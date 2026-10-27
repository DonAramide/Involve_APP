import { supabaseAdmin } from '../db/supabase';
import { emailService } from './email.service';
import { NotificationService } from './notification.service';

export type TenantAlertKind =
  | 'transaction'
  | 'withdrawal'
  | 'lowbalance'
  | 'newlogin'
  | 'passwordchange'
  | 'newstaff'
  | 'stocklow'
  | 'report';

export type TenantNotificationPrefs = Record<string, boolean | string> & {
  digestFrequency?: string;
};

const DEFAULT_PREFS: TenantNotificationPrefs = {
  transaction_email: true,
  transaction_sms: false,
  transaction_push: true,
  withdrawal_email: true,
  withdrawal_sms: false,
  withdrawal_push: true,
  lowbalance_email: true,
  lowbalance_sms: false,
  lowbalance_push: true,
  newlogin_email: true,
  newlogin_sms: false,
  newlogin_push: true,
  passwordchange_email: true,
  passwordchange_sms: false,
  passwordchange_push: true,
  newstaff_email: true,
  newstaff_sms: false,
  newstaff_push: true,
  stocklow_email: true,
  stocklow_sms: false,
  stocklow_push: true,
  report_email: true,
  report_sms: false,
  report_push: true,
  digestFrequency: 'realtime',
};

const LOW_BALANCE_NAIRA = Number(process.env.TENANT_LOW_BALANCE_THRESHOLD || 5000);

function channelOn(prefs: TenantNotificationPrefs, kind: TenantAlertKind, channel: 'email' | 'push'): boolean {
  return prefs[`${kind}_${channel}`] !== false;
}

function naira(amount: number): string {
  return `₦${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export class TenantAlertService {
  static defaultPrefs(): TenantNotificationPrefs {
    return { ...DEFAULT_PREFS };
  }

  static async getPrefs(tenantId: string): Promise<TenantNotificationPrefs> {
    const { data } = await supabaseAdmin
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .maybeSingle();
    const stored = (data?.settings as any)?.notification_prefs;
    return { ...DEFAULT_PREFS, ...(stored && typeof stored === 'object' ? stored : {}) };
  }

  static async savePrefs(tenantId: string, prefs: TenantNotificationPrefs): Promise<TenantNotificationPrefs> {
    const merged = { ...DEFAULT_PREFS, ...prefs };
    const { data } = await supabaseAdmin
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .maybeSingle();
    const settings = { ...((data?.settings as object) || {}), notification_prefs: merged };
    const { error } = await supabaseAdmin.from('tenants').update({ settings }).eq('id', tenantId);
    if (error) throw new Error(error.message);
    return merged;
  }

  static async recipients(tenantId: string): Promise<Array<{ email: string; name: string; userId?: string }>> {
    const out = new Map<string, { email: string; name: string; userId?: string }>();
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('owner_email, owner_name, name, support_email')
      .eq('id', tenantId)
      .maybeSingle();
    const ownerEmail = String(tenant?.owner_email || '').trim().toLowerCase();
    if (ownerEmail.includes('@')) {
      out.set(ownerEmail, {
        email: ownerEmail,
        name: tenant?.owner_name || tenant?.name || ownerEmail.split('@')[0],
      });
    }
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);
    for (const u of users || []) {
      const email = String(u.email || '').trim().toLowerCase();
      if (!email.includes('@')) continue;
      const role = String(u.role || '').toLowerCase();
      if (!['owner', 'admin', 'tenant_admin', 'finance_staff'].includes(role) && out.size > 0) {
        continue;
      }
      if (!out.has(email)) {
        out.set(email, { email, name: u.name || email.split('@')[0], userId: u.id });
      } else if (u.id) {
        out.get(email)!.userId = u.id;
      }
    }
    return Array.from(out.values());
  }

  static async notify(
    tenantId: string,
    kind: TenantAlertKind,
    opts: { title: string; body: string; amount?: number },
  ): Promise<void> {
    try {
      const prefs = await this.getPrefs(tenantId);
      const people = await this.recipients(tenantId);
      if (!people.length) {
        console.warn(`[TenantAlert] No recipient emails for tenant ${tenantId} kind=${kind}`);
        return;
      }

      if (channelOn(prefs, kind, 'email')) {
        await Promise.allSettled(
          people.map((p) =>
            emailService.sendTenantAlertEmail(p.email, {
              name: p.name,
              title: opts.title,
              body: opts.body,
            }),
          ),
        );
      }

      if (channelOn(prefs, kind, 'push')) {
        await NotificationService.sendToFleet({
          title: opts.title,
          body: opts.body,
          tenantId,
          data: { type: `tenant.alert.${kind}` },
        }).catch((e: any) => console.warn('[TenantAlert] push skipped:', e?.message || e));
      }
    } catch (e: any) {
      console.warn(`[TenantAlert] ${kind} failed:`, e?.message || e);
    }
  }

  static notifyTransaction(tenantId: string, payload: {
    invoiceNumber?: string;
    amount?: number;
    customerName?: string;
    count?: number;
  }): void {
    const count = payload.count && payload.count > 1 ? payload.count : 1;
    const title = count > 1 ? `${count} sales recorded` : 'Transaction completed';
    const who = payload.customerName ? ` for ${payload.customerName}` : '';
    const inv = payload.invoiceNumber ? ` (${payload.invoiceNumber})` : '';
    const body =
      count > 1
        ? `${count} invoices synced totalling ${naira(Number(payload.amount || 0))}.`
        : `A sale of ${naira(Number(payload.amount || 0))} was recorded${who}${inv}.`;
    void this.notify(tenantId, 'transaction', { title, body, amount: payload.amount });
  }

  static notifyWithdrawal(tenantId: string, payload: { amount: number; reference?: string }): void {
    const body = `A wallet withdrawal of ${naira(payload.amount)} was initiated${
      payload.reference ? ` (ref ${payload.reference})` : ''
    }.`;
    void this.notify(tenantId, 'withdrawal', {
      title: 'Wallet withdrawal',
      body,
      amount: payload.amount,
    });
    void this.checkLowBalance(tenantId);
  }

  static async checkLowBalance(tenantId: string): Promise<void> {
    try {
      const { data } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      const balance = Number(data?.balance || 0);
      if (balance < LOW_BALANCE_NAIRA) {
        await this.notify(tenantId, 'lowbalance', {
          title: 'Low wallet balance',
          body: `Your wallet balance is ${naira(balance)}, below the ${naira(LOW_BALANCE_NAIRA)} alert threshold.`,
          amount: balance,
        });
      }
    } catch (e: any) {
      console.warn('[TenantAlert] low-balance check failed:', e?.message || e);
    }
  }

  static wantsLoginEmail(prefs: TenantNotificationPrefs): boolean {
    return channelOn(prefs, 'newlogin', 'email');
  }
}
