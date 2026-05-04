// src/controllers/wallet.controller.ts
import { Request, Response } from 'express';
import { WalletService } from '../services/wallet.service';

export class WalletController {
  /**
   * GET /wallet
   * Returns current balance for the authenticated tenant.
   */
  static async getBalance(req: Request, res: Response) {
    try {
      // tenantId comes from Auth middleware context
      const tenantId = (req as any).user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
      }

      const balanceInfo = await WalletService.getBalance(tenantId);
      
      return res.status(200).json(balanceInfo);
    } catch (error: any) {
      console.error('[WalletController] getBalance Error:', error.message);
      return res.status(500).json({ error: "Failed to retrieve wallet balance" });
    }
  }

  /**
   * GET /wallet/transactions
   * Returns transaction history for the authenticated tenant.
   */
  static async getTransactions(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({ error: "Unauthorized: Tenant context missing" });
      }

      const { startDate, endDate, status } = req.query;
      const transactions = await WalletService.getTransactions(tenantId, { startDate, endDate, status });

      return res.status(200).json({
        tenantId,
        count: transactions.length,
        transactions
      });
    } catch (error: any) {
      console.error('[WalletController] getTransactions Error:', error.message);
      return res.status(500).json({ error: "Failed to retrieve transactions" });
    }
  }
}
