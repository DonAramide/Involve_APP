// src/controllers/billing.controller.ts
import { Request, Response } from 'express';
import { BillingService } from '../services/billing.service';
import { supabase } from '../db/supabase';

export class BillingController {
  /**
   * GET /billing/status
   */
  static async getStatus(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user.tenantId;
      const status = await BillingService.getBillingStatus(tenantId);
      return res.status(200).json(status);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /billing/subscribe
   * Initiates payment for a subscription plan.
   */
  static async subscribe(req: Request, res: Response) {
    try {
      const { plan } = req.body;
      const { tenantId, email } = (req as any).user;

      // 1. Get Plan pricing
      const { data: limit } = await supabase
        .from('usage_limits')
        .select('price_ngn')
        .eq('plan', plan)
        .single();

      if (!limit) return res.status(400).json({ error: 'Invalid plan selected' });

      // 2. Integration: Use Quaser Payment to handle checkout
      // We pass the subscription metadata for the webhook to capture
      const { PaymentController } = require('./payment.controller');
      
      const paymentPayload = {
        amount: limit.price_ngn,
        email,
        metadata: {
          type: 'subscription',
          plan,
          tenant_id: tenantId
        }
      };

      // Mocking the payment initialization call internally
      // In a real scenario, this returns the Quaser checkout URL
      return res.status(200).json({
        message: `Checkout initialized for ${plan} plan`,
        amount: limit.price_ngn,
        checkoutUrl: `https://checkout.quaser.com/invify?tenant=${tenantId}&plan=${plan}`,
        metadata: paymentPayload.metadata
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
