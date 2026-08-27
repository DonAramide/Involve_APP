// src/controllers/payment.controller.ts
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { PaymentGatewayConvergenceService } from '../services/gateway.service';
import { assertTransactionTenantAccess, resolveAuthoritativeTenantId } from '../utils/finance-tenant';

export class PaymentController {
  /**
   * POST /payments/create | POST /payments/intents
   * Initiates the payment workflow by persisting a record and creating a Quaser intent.
   */
  static async createPayment(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const { walletId, studentName, amount, metadata } = req.body;
      const idempotencyKey =
        (req.headers['idempotency-key'] as string) ||
        (req.headers['x-idempotency-key'] as string) ||
        req.body?.idempotencyKey;

      if (!walletId || !studentName || !amount) {
        return res.status(400).json({ error: "WalletId, StudentName, and Amount are required." });
      }

      const result = await PaymentService.createIntent({
        tenantId,
        walletId,
        studentName,
        amount,
        metadata,
        idempotencyKey,
      });

      return res.status(201).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      console.error('[PaymentController] createPayment Error:', error.message);
      return res.status(status).json({ error: error.message });
    }
  }

  /**
   * POST /payments/initialize
   * Direct multi-processor checkout gateway initialisation layer (Stripe/Paystack/Flutterwave).
   */
  static async initializeGatewayCheckout(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const { gateway, amount, currency, customerEmail, metadata } = req.body;
      const idempotencyKey =
        (req.headers['idempotency-key'] as string) ||
        (req.headers['x-idempotency-key'] as string) ||
        req.body?.idempotencyKey;

      if (!gateway || !amount || !customerEmail) {
        return res.status(400).json({ error: "gateway (stripe/paystack/flutterwave), amount, and customerEmail are required." });
      }

      const result = await PaymentGatewayConvergenceService.initializeCheckout({
        tenantId,
        gateway,
        amount,
        currency: currency || "NGN",
        customerEmail,
        metadata,
        idempotencyKey,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      console.error('[PaymentController] initializeGatewayCheckout Error:', error.message);
      return res.status(status).json({ error: error.message });
    }
  }

  static async getPaymentIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await PaymentService.getIntent(id);
      assertTransactionTenantAccess(result.tenant_id, req);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || (error.message.includes('not found') ? 404 : 500);
      console.error('[PaymentController] getPaymentIntent Error:', error.message);
      return res.status(status).json({ error: error.message });
    }
  }

  static async cancelPaymentIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const existing = await PaymentService.getIntent(id);
      assertTransactionTenantAccess(existing.tenant_id, req);
      const result = await PaymentService.cancelIntent(id);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || (error.message.includes('not found') ? 404 : 500);
      console.error('[PaymentController] cancelPaymentIntent Error:', error.message);
      return res.status(status).json({ error: error.message });
    }
  }

  static async getPaymentHistory(req: Request, res: Response) {
    try {
      const tenantId = resolveAuthoritativeTenantId(req);
      const result = await PaymentService.getHistory(tenantId);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || 500;
      console.error('[PaymentController] getPaymentHistory Error:', error.message);
      return res.status(status).json({ error: error.message });
    }
  }

  static async refundPaymentIntent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      if (!amount) {
        return res.status(400).json({ error: "amount is required for processing refunds." });
      }
      const existing = await PaymentService.getIntent(id);
      assertTransactionTenantAccess(existing.tenant_id, req);

      const idempotencyKey =
        (req.headers['idempotency-key'] as string) ||
        (req.headers['x-idempotency-key'] as string) ||
        req.body?.idempotencyKey;

      const result = await PaymentService.refundIntent(id, amount, reason, idempotencyKey);
      return res.status(200).json(result);
    } catch (error: any) {
      const status = error.status || (error.message.includes('not found') ? 404 : 500);
      console.error('[PaymentController] refundPaymentIntent Error:', error.message);
      return res.status(status).json({ error: error.message });
    }
  }
}
