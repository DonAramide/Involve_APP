// src/controllers/payment.controller.ts
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { PaymentGatewayConvergenceService } from '../services/gateway.service';

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

  /**
   * POST /payments/initialize
   * Direct multi-processor checkout gateway initialisation layer (Stripe/Paystack/Flutterwave).
   */
  static async initializeGatewayCheckout(req: Request, res: Response) {
    try {
      const { tenantId, gateway, amount, currency, customerEmail, metadata } = req.body;

      if (!tenantId || !gateway || !amount || !customerEmail) {
        return res.status(400).json({ error: "TenantId, gateway (stripe/paystack/flutterwave), amount, and customerEmail are required." });
      }

      const result = await PaymentGatewayConvergenceService.initializeCheckout({
        tenantId,
        gateway,
        amount,
        currency: currency || "NGN",
        customerEmail,
        metadata
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[PaymentController] initializeGatewayCheckout Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getPaymentIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await PaymentService.getIntent(id);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[PaymentController] getPaymentIntent Error:', error.message);
      return res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
    }
  }

  static async cancelPaymentIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await PaymentService.cancelIntent(id);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[PaymentController] cancelPaymentIntent Error:', error.message);
      return res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
    }
  }

  static async getPaymentHistory(req: Request, res: Response) {
    try {
      const { tenantId } = req.query;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required." });
      }
      const result = await PaymentService.getHistory(tenantId as string);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[PaymentController] getPaymentHistory Error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  static async refundPaymentIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      if (!amount) {
        return res.status(400).json({ error: "amount is required for processing refunds." });
      }
      const result = await PaymentService.refundIntent(id, amount, reason);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[PaymentController] refundPaymentIntent Error:', error.message);
      return res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
    }
  }
}
