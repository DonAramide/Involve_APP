// src/controllers/finance.controller.ts
import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../db/supabase';

export class ExecutiveFinanceController {
  /**
   * GET /api/finance/executive-summary
   * Returns a high-level financial overview for school executives.
   */
  static async getSummary(req: Request, res: Response) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    const { startDate, endDate } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      // 2. Query and aggregate from the invoices table
      let invoiceQuery = supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId);

      if (startDate) invoiceQuery = invoiceQuery.gte('created_at', startDate);
      if (endDate) invoiceQuery = invoiceQuery.lte('created_at', endDate);

      const [
        walletRes,
        invoicesRes,
        allInvoicesRes,
        payoutsRes,
        studentsRes,
        customersRes,
        unmatchedRes,
        failedPayoutsRes
      ] = await Promise.all([
        supabaseAdmin.from('wallets').select('balance').eq('tenant_id', tenantId).single(),
        invoiceQuery,
        supabaseAdmin.from('invoices').select('customer_id, amount_paid, payment_method, created_at').eq('tenant_id', tenantId),
        supabaseAdmin.from('transactions_log').select('amount').eq('tenant_id', tenantId).eq('type', 'payout').eq('status', 'SUCCESS'),
        supabaseAdmin.from('students').select('id, running_balance').eq('school_id', tenantId),
        supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabaseAdmin.from('transactions_log').select('id').eq('tenant_id', tenantId).eq('status', 'PENDING').is('metadata->studentId', null),
        supabaseAdmin.from('transactions_log').select('id').eq('tenant_id', tenantId).eq('status', 'FAILED').eq('type', 'payout')
      ]);

      const wallet = walletRes.data;
      const invoices = invoicesRes.data;
      const allInvoices = allInvoicesRes.data;
      const payouts = payoutsRes.data;
      const students = studentsRes.data;
      const custCount = customersRes.count;
      const unmatched = unmatchedRes.data;
      const failedPayouts = failedPayoutsRes.data;

      let totalInvoiced = 0;
      let totalCollected = 0;
      let card = 0;
      let transfer = 0;
      let cash = 0;
      let walletAmount = 0;
      const invoiceCount = invoices?.length || 0;

      for (const inv of (invoices || [])) {
        const amt = Number(inv.total_amount || 0);
        const paid = Number(inv.amount_paid || 0);
        totalInvoiced += amt;
        totalCollected += paid;

        const method = (inv.payment_method || '').toLowerCase();
        if (method === 'cash') {
          cash += paid;
        } else if (method === 'transfer') {
          transfer += paid;
        } else if (method === 'card' || method === 'pos') {
          card += paid;
        } else if (method === 'wallet') {
          walletAmount += paid;
        }
      }

      const allTimeCollected = allInvoices?.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0) || 0;

      let totalQuasarCollected = 0;
      for (const inv of (allInvoices || [])) {
        const paid = Number(inv.amount_paid || 0);
        const method = (inv.payment_method || '').toLowerCase();
        // Quasar rails: bank transfer (VA) + card/POS — cash stays local
        if (method === 'transfer' || method === 'card' || method === 'pos') {
          totalQuasarCollected += paid;
        }
      }

      const totalQuasarRemitted = payouts?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
      // Funds still held / awaiting remittance to merchant bank
      const pendingQuasarRemittance = Math.max(0, totalQuasarCollected - totalQuasarRemitted);

      let totalCount = 0;
      let owingCount = 0;
      let paidCount = 0;

      if (students && students.length > 0) {
        totalCount = students.length;
        owingCount = students.filter(s => Number(s.running_balance || 0) < 0).length;
        paidCount = Math.max(0, totalCount - owingCount);
      } else {
        const customerInvoiceMap = new Map<string, string[]>();
        allInvoices?.forEach((inv: any) => {
          if (inv.customer_id) {
            if (!customerInvoiceMap.has(inv.customer_id)) {
              customerInvoiceMap.set(inv.customer_id, []);
            }
            customerInvoiceMap.get(inv.customer_id)!.push(inv.payment_status || 'Unpaid');
          }
        });
        
        totalCount = custCount || 0;
        customerInvoiceMap.forEach((statuses) => {
          const hasUnpaid = statuses.some(s => s.toLowerCase() !== 'paid');
          if (hasUnpaid) owingCount++;
        });
        paidCount = Math.max(0, totalCount - owingCount);
      }

      return res.status(200).json({
        walletBalance: wallet?.balance || 0,
        totalCollected: allTimeCollected,
        revenueInRange: totalCollected,
        /** All-time card + transfer (Quasar) collections */
        totalQuasarCollected,
        /** Successful remittances / payouts to merchant */
        totalQuasarRemitted,
        /** Still to remit = Quasar collections − remitted */
        pendingQuasarRemittance,
        salesSummary: {
          totalInvoiced,
          totalCollected,
          card,
          transfer,
          cash,
          wallet: walletAmount,
          invoiceCount
        },
        studentMetrics: {
          total: totalCount,
          paid: paidCount,
          owing: owingCount
        },
        alerts: {
          unmatchedCount: unmatched?.length || 0,
          failedPayoutsCount: failedPayouts?.length || 0
        }
      });
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] Error:', error.message);
      return res.status(500).json({ error: 'Failed to generate executive summary' });
    }
  }

  /**
   * GET /api/finance/payouts/stats
   * Returns global system aggregates for payouts/settlements
   */
  static async getPayoutStats(req: Request, res: Response) {
    try {
      const tenantId = (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string) || (req as any).user?.tenantId;

      let creditsQuery = supabaseAdmin
        .from('ledger_entries')
        .select('amount')
        .in('entry_type', ['CARD_PAYMENT', 'VIRTUAL_ACCOUNT_CREDIT'])
        .eq('type', 'CREDIT');

      let debitsQuery = supabaseAdmin
        .from('ledger_entries')
        .select('amount')
        .eq('entry_type', 'WITHDRAWAL')
        .eq('type', 'DEBIT');

      let disputesQuery = supabaseAdmin
        .from('reconciliation_cases')
        .select('difference_amount')
        .in('status', ['PENDING', 'INVESTIGATING', 'ESCALATED']);

      let failedQuery = supabaseAdmin
        .from('reconciliation_cases')
        .select('id')
        .eq('status', 'FAILED');

      if (tenantId) {
        creditsQuery = creditsQuery.eq('tenant_id', tenantId);
        debitsQuery = debitsQuery.eq('tenant_id', tenantId);
        disputesQuery = disputesQuery.eq('tenant_id', tenantId);
        failedQuery = failedQuery.eq('tenant_id', tenantId);
      }

      const [creditsRes, debitsRes, disputesRes, failedRes] = await Promise.all([
        creditsQuery,
        debitsQuery,
        disputesQuery,
        failedQuery
      ]);

      if (creditsRes.error) console.error('Error fetching credits:', creditsRes.error);
      if (debitsRes.error) console.error('Error fetching debits:', debitsRes.error);
      if (disputesRes.error) console.error('Error fetching disputes:', disputesRes.error);
      if (failedRes.error) console.error('Error fetching failed cases:', failedRes.error);

      const totalCredits = creditsRes.data?.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0) || 0;
      const totalDebits = debitsRes.data?.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0) || 0;
      
      const pendingSettlement = Math.max(0, totalCredits - totalDebits);
      const clearedToday = totalDebits;
      const heldFunds = disputesRes.data?.reduce((acc: number, curr: any) => acc + Number(curr.difference_amount || 0), 0) || 0;
      const failedTransfers = failedRes.data?.length || 0;

      return res.status(200).json({
        pendingSettlement,
        clearedToday,
        heldFunds,
        failedTransfers
      });
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getPayoutStats Error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch payout stats' });
    }
  }

  /**
   * GET /api/v1/finance/settlement-phases
   * Returns a chronological timeline of settlement events derived from actual ledger/settlement records.
   */
  static async getSettlementPhases(req: Request, res: Response) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });

    try {
      // Fetch distinct settlement operations from the ledger for this tenant
      const { data, error } = await supabaseAdmin
        .from('ledger_entries')
        .select('id, entry_type, amount, status, created_at, metadata, reference')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const phasesMap = new Map<string, any>();
      
      data?.forEach(entry => {
        // derive operational phase from metadata, reference prefix, or type
        let phaseCode = 'SYSTEM';
        if (entry.metadata && entry.metadata.source) phaseCode = entry.metadata.source;
        else if (entry.reference && entry.reference.startsWith('QS-TX')) phaseCode = 'QUASAR_POS';
        else if (entry.reference && entry.reference.startsWith('QS-PO')) phaseCode = 'TREASURY_PAYOUT';
        else phaseCode = entry.entry_type || 'UNKNOWN';

        if (!phasesMap.has(phaseCode)) {
          phasesMap.set(phaseCode, {
            title: phaseCode.toUpperCase().replace(/_/g, ' ') + ' BATCHING',
            desc: `Aggregating ${phaseCode} events. Last amount: N${entry.amount}`,
            active: entry.status === 'completed',
            timestamp: entry.created_at
          });
        }
      });

      const phases = Array.from(phasesMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return res.status(200).json(phases);
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getSettlementPhases Error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch settlement phases' });
    }
  }

  static async getQuasarTransactions(req: Request, res: Response) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    const { date } = req.query; // YYYY-MM-DD format

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      const queryDate = date ? String(date) : new Date().toISOString().split('T')[0];
      const start = `${queryDate}T00:00:00.000Z`;
      const end = `${queryDate}T23:59:59.999Z`;

      const { data, error } = await supabaseAdmin
        .from('transactions_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json({ success: true, date: queryDate, data });
    } catch (error: any) {
      console.error('[ExecutiveFinanceController] getQuasarTransactions Error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch Quasar transactions' });
    }
  }
}
