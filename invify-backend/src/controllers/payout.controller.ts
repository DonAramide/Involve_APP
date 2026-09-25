// src/controllers/payout.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { PaymentService } from '../services/payment.service';
import { getQuasarService } from '../integrations/quasar/factory';
import { resolveAuthoritativeTenantId } from '../utils/finance-tenant';
import * as fs from 'fs';
import * as path from 'path';

const BANK_CODES: Array<{ name: string; code: string }> = [
  { name: 'Access Bank', code: '044' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'GTBank', code: '058' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'UBA', code: '033' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Wema Bank (ALAT)', code: '035' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Union Bank', code: '032' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'FCMB', code: '214' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Opay', code: '999992' },
  { name: 'OPay Digital Services', code: '999992' },
  { name: 'Palmpay', code: '999991' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Moniepoint', code: '50515' },
  { name: 'Moniepoint MFB', code: '50515' },
  { name: 'VFD Microfinance Bank', code: '566' },
];

function normalizeBankKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function bankCodeFromName(bankName: string): string {
  const want = normalizeBankKey(bankName);
  if (!want) return '';
  const exact = BANK_CODES.find((b) => normalizeBankKey(b.name) === want);
  if (exact) return exact.code;
  const partial = BANK_CODES.find(
    (b) => normalizeBankKey(b.name).includes(want) || want.includes(normalizeBankKey(b.name)),
  );
  return partial?.code || '';
}

function normalizePayoutBody(body: any) {
  const account_number = String(body?.account_number || body?.accountNumber || '').trim();
  const account_name = String(body?.account_name || body?.accountName || '').trim();
  const bank_name = String(body?.bank_name || body?.bankName || '').trim();
  let bank_code = String(body?.bank_code || body?.bankCode || '').trim();
  if (!bank_code) bank_code = bankCodeFromName(bank_name);
  return { account_number, account_name, bank_name, bank_code };
}

function hasPayoutAccount(row: any): boolean {
  return Boolean(String(row?.account_number || row?.accountNumber || '').trim());
}

export class PayoutController {
  private static getLocalSettingsPath() {
    return path.join(process.cwd(), 'tenant_payout_settings.json');
  }

  private static getLocalTenantSettings(tenantId: string): any {
    try {
      const filePath = PayoutController.getLocalSettingsPath();
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const allSettings = JSON.parse(fileContent);
        return allSettings[tenantId] || null;
      }
    } catch (err) {
      console.error('[PayoutController] Failed to read local tenant payout settings:', err);
    }
    return null;
  }

  private static saveLocalTenantSettings(tenantId: string, settings: any) {
    try {
      const filePath = PayoutController.getLocalSettingsPath();
      let allSettings: any = {};
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        allSettings = JSON.parse(fileContent);
      }
      allSettings[tenantId] = {
        ...allSettings[tenantId],
        ...settings,
        updated_at: new Date().toISOString()
      };
      fs.writeFileSync(filePath, JSON.stringify(allSettings, null, 2), 'utf8');
    } catch (err) {
      console.error('[PayoutController] Failed to write local tenant payout settings:', err);
    }
  }

  /**
   * GET /api/payout/settings
   */
  static async getSettings(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);

      const { data, error } = await supabaseAdmin
        .from('payout_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      if (hasPayoutAccount(data)) return res.status(200).json(data);

      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('settings')
        .eq('id', tenantId)
        .maybeSingle();
      const fromTenant = (tenant?.settings as any)?.payout;
      if (hasPayoutAccount(fromTenant)) return res.status(200).json(fromTenant);

      const localData = PayoutController.getLocalTenantSettings(tenantId);
      if (hasPayoutAccount(localData)) return res.status(200).json(localData);

      return res.status(200).json({});
    } catch (error: any) {
      const status = error.status || 500;
      if (status !== 500) return res.status(status).json({ error: error.message });
      console.warn('[PayoutController] Supabase getSettings failed. Falling back to local cache:', error.message);
      try {
        const tenantId = resolveAuthoritativeTenantId(req);
        const localData = PayoutController.getLocalTenantSettings(tenantId);
        if (hasPayoutAccount(localData)) return res.status(200).json(localData);
      } catch (_) { /* ignore */ }
      return res.status(200).json({});
    }
  }

  /**
   * POST /api/payout/settings
   */
  static async saveSettings(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const { account_number, bank_code, bank_name, account_name } = normalizePayoutBody(req.body);

      if (!account_number || !account_name || (!bank_code && !bank_name)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (!bank_code) {
        return res.status(400).json({ error: 'Could not resolve bank code. Pick the bank from the list and save again.' });
      }

      const payload = {
        tenant_id: tenantId,
        account_number,
        bank_code,
        bank_name,
        account_name
      };
      PayoutController.saveLocalTenantSettings(tenantId, payload);

      try {
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('settings')
          .eq('id', tenantId)
          .maybeSingle();
        const existingSettings = tenant?.settings && typeof tenant.settings === 'object' ? tenant.settings : {};
        await supabaseAdmin
          .from('tenants')
          .update({
            settings: { ...existingSettings, payout: payload },
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenantId);
      } catch (settingsErr: any) {
        console.warn('[PayoutController] tenants.settings payout backup skipped:', settingsErr?.message || settingsErr);
      }

      try {
        const { data, error } = await supabaseAdmin
          .from('payout_settings')
          .upsert({
            tenant_id: tenantId,
            account_number,
            bank_code,
            account_name,
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id' })
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({
          success: true,
          settings: { ...(data || {}), bank_name },
        });
      } catch (error: any) {
        console.warn('[PayoutController] Supabase saveSettings failed. Saved to tenant settings / local cache:', error.message);
        return res.status(200).json({
          success: true,
          settings: {
            ...payload,
            updated_at: new Date().toISOString()
          }
        });
      }
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message });
    }
  }

  /**
   * GET /api/payout/history
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const { page = 1, limit = 20 } = req.query;

      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error, count } = await supabaseAdmin
        .from('transactions_log')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('type', 'payout')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return res.status(200).json({
        data,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit)
        }
      });
    } catch (error: any) {
      const status = error.status || 500;
      console.error('[PayoutController] getHistory error:', error.message);
      return res.status(status).json({ error: status === 500 ? 'Failed to fetch payout history' : error.message });
    }
  }

  /**
   * POST /api/payout/withdraw
   */
  static async withdraw(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const { amount, destination, staffId, metadata } = req.body;
      const idempotencyKey =
        (req.headers['idempotency-key'] as string) ||
        (req.headers['x-idempotency-key'] as string) ||
        req.body?.idempotencyKey;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid withdrawal amount required' });
      }

      if (destination) {
        if (!destination.account_number || !destination.bank_code || !destination.account_name) {
          return res.status(400).json({ error: 'Incomplete destination bank details' });
        }
      }

      const result = await PaymentService.createPayout(tenantId, Number(amount), {
        destination: destination || undefined,
        idempotencyKey,
        metadata: {
          ...(metadata || {}),
          ...(staffId ? { staffId, type: metadata?.type || 'staff_salary' } : {}),
        },
      });
      return res.status(200).json({
        success: true,
        message: staffId ? 'Staff salary payout initiated successfully' : 'Payout initiated successfully',
        reference: result.reference,
        status: result.status
      });
    } catch (error: any) {
      console.error('[PayoutController] initiatePayout error:', error.message);
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  /**
   * GET /api/payout/banks
   */
  static async getBanks(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const { country = 'nigeria' } = req.query;

      const quasar = await getQuasarService(tenantId);
      const banks = await quasar.getBanks(country as string);
      return res.status(200).json({
        responseCode: "00",
        responseMessage: "Banks retrieved successfully",
        data: banks
      });
    } catch (error: any) {
      console.error('[PayoutController] getBanks error:', error.message);
      return res.status(error.status || 400).json({ error: error.message });
    }
  }

  /**
   * POST /api/payout/resolve-account
   */
  static async resolveAccount(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const { account_number, bank_code } = req.body;

      if (!account_number || !bank_code) {
        return res.status(400).json({ error: 'Missing required parameters: account_number, bank_code' });
      }

      const quasar = await getQuasarService(tenantId);
      const result = await quasar.resolveAccount(account_number, bank_code);
      return res.status(200).json({
        responseCode: "00",
        responseMessage: "Account resolved successfully",
        data: result
      });
    } catch (error: any) {
      console.error('[PayoutController] resolveAccount error:', error.message);
      return res.status(error.status || 400).json({ error: error.message });
    }
  }
}
