// src/controllers/finance.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';

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
      // 1. Fetch Wallet Balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('tenant_id', tenantId)
        .single();

      // 2. Aggregate Revenue (Total Collected All Time)
      const { data: allTimeRevenue } = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gt('amount', 0);

      const totalCollected = allTimeRevenue?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      // 3. Aggregate Revenue in Range
      let rangeQuery = supabase
        .from('ledger_entries')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gt('amount', 0);

      if (startDate) rangeQuery = rangeQuery.gte('created_at', startDate);
      if (endDate) rangeQuery = rangeQuery.lte('created_at', endDate);

      const { data: rangeRevenue } = await rangeQuery;
      const totalRevenueInRange = rangeRevenue?.reduce((sum, entry) => sum + Number(entry.amount), 0) || 0;

      // 4. Student Metrics (Paid vs Owing)
      // This usually comes from a view or business logic service. 
      // For now, we simulate from the students table.
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', tenantId);

      // 5. Reconciliation Alerts
      const { data: unmatched } = await supabase
        .from('transactions_log')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'PENDING')
        .is('metadata->studentId', null);

      const { data: failedPayouts } = await supabase
        .from('transactions_log')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'FAILED')
        .eq('type', 'payout');

      return res.status(200).json({
        walletBalance: wallet?.balance || 0,
        totalCollected,
        revenueInRange: totalRevenueInRange,
        studentMetrics: {
          total: totalStudents || 0,
          paid: 0, // Mocked for now, needs fee_structure integration
          owing: 0
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
}
