import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { PosService } from '../services/pos.service';
import { resolveAuthoritativeTenantId } from '../utils/finance-tenant';
import { resolveTenantScope } from '../utils/resolve-tenant-scope';
import { GovAuditService } from '../services/gov-audit.service';

export class AuditController {
  /**
   * GET /api/admin/audit-logs
   * Tenant-scoped system audit (financial + terminal + device + governance).
   */
  static async getSystemAuditLogs(req: Request, res: Response) {
    try {
      const user = (req as any).user || {};
      const role = String(user.role || '').toLowerCase();
      const platform = ['super_admin', 'internal_staff'].includes(role);
      const tenantId = platform
        ? String(req.query.tenantId || req.headers['x-tenant-id'] || user.tenantId || '').trim()
        : resolveTenantScope(req);

      const result = await GovAuditService.getLedger({
        tenantId: tenantId || undefined,
        page: String(req.query.page || '1'),
        limit: String(req.query.limit || '100'),
      });

      const data = (result.data || []).map((entry) => ({
        ...entry,
        action_type: entry.action,
        created_at: entry.timestamp,
        details: entry.metadata || null,
        terminal_id: entry.module === 'TERMINAL' ? entry.target : null,
        status: entry.status,
      }));

      return res.status(200).json({
        success: true,
        data,
        total: result.total,
        stats: result.stats,
      });
    } catch (error: any) {
      console.error('[AuditController] getSystemAuditLogs Error:', error.message);
      return res.status(500).json({ error: error.message || 'Failed to load audit logs' });
    }
  }

  static async getTransactionLedger(req: Request, res: Response) {
    try {
      let tenantId: string;
      try {
        tenantId = resolveAuthoritativeTenantId(req);
      } catch (err: any) {
        return res.status(err?.status || 403).json({ error: err?.message || 'Forbidden: Cross-tenant access denied' });
      }
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      // 1. Fetch successful Cash and Transfer invoices
      let invoicesData: any[] = [];
      if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
         // Mock response for invoices
         invoicesData = [];
      } else {
         const { data, error } = await supabase
           .from('invoices')
           .select('*')
           .eq('tenant_id', tenantId)
           .in('payment_method', ['CASH', 'TRANSFER', 'VIRTUAL_ACCOUNT'])
           .order('created_at', { ascending: false })
           .limit(100);
           
         if (!error && data) invoicesData = data;
      }

      // 2. Fetch POS attempts (Cards)
      let posData: any[] = [];
      if (process.env.OFFLINE_LOCAL_AUTH === 'true') {
         posData = await PosService.getTransactionHistory(tenantId);
      } else {
         const { data, error } = await supabase
           .from('pos_transaction_attempts')
           .select('*')
           .eq('tenant_id', tenantId)
           .order('created_at', { ascending: false })
           .limit(100);
           
         if (!error && data) posData = data;
      }

      // 3. Unify the data
      const unified: any[] = [];
      
      // Map invoices
      for (const inv of invoicesData) {
        unified.push({
          id: inv.id,
          type: 'INVOICE',
          paymentMethod: inv.payment_method,
          amount: inv.total_amount || 0,
          status: inv.payment_status === 'Paid' ? 'Approved' : (inv.payment_status || 'Pending'),
          staffName: inv.staff_name || 'System',
          date: inv.created_at,
          items: inv.items || [],
          customerName: inv.customer_name || 'Walk-in',
          reference: inv.invoice_number || ''
        });
      }

      // Map POS attempts
      for (const pos of posData) {
        const approved = (pos.status || '').toLowerCase() === 'approved';
        const settled = (pos.settlement_status || '').toLowerCase() === 'settled';
        let displayStatus = pos.status || 'Pending';
        if (approved && settled) {
          displayStatus = 'Settled';
        } else if (approved) {
          displayStatus = 'Approved (Unsettled)';
        }

        unified.push({
          id: pos.id,
          type: 'POS',
          paymentMethod: 'CARD',
          amount: pos.amount || 0,
          status: displayStatus,
          settlementStatus: pos.settlement_status || 'unsettled',
          settledAt: pos.settled_at || null,
          staffName: pos.staff_name || pos.staffName || 'System',
          date: pos.created_at || pos.date,
          items: pos.items_jsonb || pos.items || [],
          customerName: 'Cardholder',
          reference: pos.rrn || pos.id,
          rrn: pos.rrn || null,
          stan: pos.stan || null,
          terminalId: pos.terminal_id || null,
        });
      }

      // Sort by date descending
      unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return res.status(200).json(unified);
    } catch (error: any) {
      console.error('[AuditController] getTransactionLedger Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
