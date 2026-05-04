// src/controllers/retention.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabase';
import { RetentionService } from '../services/retention.service';

export class RetentionController {
  /**
   * POST /admin/retention/process
   * Manually trigger the retention scan and nudge dispatch.
   */
  static async processRetention(req: Request, res: Response) {
    try {
      await RetentionService.scanAndNudge();
      return res.status(200).json({ message: 'Retention scan completed and nudges dispatched.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/retention/stats
   * Super-admin view of at-risk users.
   */
  static async getAtRiskUsers(req: Request, res: Response) {
    try {
      const { data: users } = await supabase
        .from('users')
        .select('name, email, role, last_active_at, tenants(name)')
        .lt('last_active_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
        .order('last_active_at', { ascending: true });

      return res.status(200).json(users);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/retention/suggestion
   * Personal nudge for the current user.
   */
  static async getPersonalSuggestion(req: Request, res: Response) {
    try {
      const { tenantId } = (req as any).user;
      const suggestion = await RetentionService.getSmartSuggestion(tenantId);
      return res.status(200).json({ suggestion });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
