// src/controllers/reconciliation.controller.ts
import { Request, Response } from 'express';
import { ReconciliationService } from '../services/reconciliation.service';

export class ReconciliationController {
  /**
   * GET /api/reconciliation
   * Returns a detailed integrity report for the current tenant.
   */
  static async getReport(req: Request, res: Response) {
    const tenantId = (req.headers['x-tenant-id'] as string) || (req as any).user?.tenantId;
    const { status, page, limit } = req.query;

    if (!tenantId) {
      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        return res.status(200).json({ summary: { totalPayments: 0, matched: 0, unmatched: 0, issues: 0 }, data: [] });
      }
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    try {
      const report = await ReconciliationService.getReport({
        tenantId,
        status: status as any,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50
      });
      return res.status(200).json(report);
    } catch (error: any) {
      console.error('[ReconciliationController] Error:', error.message);
      if (process.env.OFFLINE_MOCK_AUTH === 'true') {
        return res.status(200).json({ summary: { totalPayments: 0, matched: 0, unmatched: 0, issues: 0 }, data: [] });
      }
      return res.status(500).json({ error: 'Failed to generate reconciliation report' });
    }
  }

  /**
   * POST /api/reconciliation/assign
   * Manually assigns a payment to a student.
   */
  static async assign(req: Request, res: Response) {
    const { reference, studentId } = req.body;
    try {
      const fixed = await ReconciliationService.assignPaymentToStudent(reference, studentId);
      return res.status(200).json({ success: true, record: fixed });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/reconciliation/retry
   * Retries reconciliation for a specific reference.
   */
  static async retry(req: Request, res: Response) {
    const { reference } = req.body;
    try {
      const result = await ReconciliationService.retryReconciliation(reference);
      return res.status(200).json({ success: true, result });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
