// src/controllers/payout.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { PaymentService } from '../services/payment.service';

export class PayoutController {
  /**
   * GET /api/payout/settings
   * Fetches the saved bank details for the current tenant.
   */
  static async getSettings(req: Request, res: Response) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      const { data, error } = await supabase
        .from('payout_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json(data || {});
    } catch (error: any) {
      console.error('[PayoutController] getSettings error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch payout settings' });
    }
  }

  /**
   * POST /api/payout/settings
   * Upserts bank details for the current tenant.
   */
  static async saveSettings(req: Request, res: Response) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    const { account_number, bank_code, bank_name, account_name } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    if (!account_number || !bank_code || !account_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const { data, error } = await supabase
        .from('payout_settings')
        .upsert({
          tenant_id: tenantId,
          account_number,
          bank_code,
          bank_name,
          account_name,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, settings: data });
    } catch (error: any) {
      console.error('[PayoutController] saveSettings error:', error.message);
      return res.status(500).json({ error: 'Failed to save payout settings' });
    }
  }

  /**
   * GET /api/payout/history
   * Fetches the history of fund sweeps for the school.
   */
  static async getHistory(req: Request, res: Response) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    const { page = 1, limit = 20 } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;

      const { data, error, count } = await supabase
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
      console.error('[PayoutController] getHistory error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch payout history' });
    }
  }

  /**
   * POST /api/payout/withdraw
   * Triggers a fund sweep (withdrawal) to the saved bank account.
   */
  static async withdraw(req: Request, res: Response) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    const { amount } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid withdrawal amount required' });
    }

    try {
      const result = await PaymentService.createPayout(tenantId, Number(amount));
      return res.status(200).json({
        success: true,
        message: 'Payout initiated successfully',
        reference: result.reference,
        status: result.status
      });
    } catch (error: any) {
      console.error('[PayoutController] initiatePayout error:', error.message);
      return res.status(400).json({ error: error.message });
    }
  }
}
