// src/controllers/defaulters.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';

export class DefaultersController {
  /**
   * GET /api/finance/defaulters
   * Returns a list of students with outstanding balances.
   */
  static async getDefaulters(req: Request, res: Response) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    const { class: className, status } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      // 1. Fetch Students with their current balances
      let query = supabase
        .from('students')
        .select('id, first_name, last_name, current_class, running_balance, created_at')
        .eq('school_id', tenantId);

      if (className) {
        query = query.eq('current_class', className);
      }

      // Filter by balance (defaulters usually have negative balance if Charges are negative)
      // In our schema: amount DECIMAL(15, 2) NOT NULL, -- (+) Credit/Payment, (-) Debit/Charge
      // So outstanding = negative balance
      query = query.lt('running_balance', 0);

      const { data: students, error } = await query.order('running_balance', { ascending: true }); // Highest debt first (most negative)

      if (error) throw error;

      // 2. Format for UI
      const defaulters = students.map(s => {
        const outstanding = Math.abs(Number(s.running_balance));
        return {
          studentId: s.id,
          studentName: `${s.first_name} ${s.last_name}`,
          class: s.current_class,
          totalFees: 0, // In a full implementation, we'd sum fee_structures
          totalPaid: 0, // And sum ledger payments
          outstanding: outstanding,
          status: outstanding > 0 ? (s.running_balance === 0 ? 'Paid' : 'Unpaid') : 'Paid', // Simplified
          lastPaymentDate: s.created_at // Mocked
        };
      });

      return res.status(200).json(defaulters);
    } catch (error: any) {
      console.error('[DefaultersController] Error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch defaulters' });
    }
  }

  /**
   * POST /api/finance/defaulters/remind
   * Sends a payment reminder (mocked).
   */
  static async sendReminder(req: Request, res: Response) {
    const { studentId, amount } = req.body;
    
    // In production, this would trigger a Push/SMS/Email
    console.log(`[Reminder] Sent to student ${studentId} for ₦${amount}`);
    
    return res.status(200).json({ success: true, message: 'Reminder sent successfully' });
  }
}
