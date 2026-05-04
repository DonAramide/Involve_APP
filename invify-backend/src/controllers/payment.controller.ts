// src/controllers/payment.controller.ts
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';

export class PaymentController {
  /**
   * POST /payments/create
   * Initiates the payment workflow by persisting a record and creating a Quaser intent.
   */
  static async createPayment(req: Request, res: Response) {
    try {
      const { tenantId, walletId, studentName, amount, metadata } = req.body;

      if (!tenantId || !walletId || !studentName || !amount) {
        return res.status(400).json({ error: "TenantId, WalletId, StudentName, and Amount are required." });
      }

      const result = await PaymentService.createIntent({
        tenantId,
        walletId,
        studentName,
        amount,
        metadata
      });

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('[PaymentController] createPayment Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
}
