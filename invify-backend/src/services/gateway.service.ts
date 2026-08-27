// src/services/gateway.service.ts
import crypto from "crypto";
import { supabase } from "../db/supabase";
import { AuditService } from "./audit.service";
import { BuildVariantService } from "../config/build-variant";

export interface CheckoutParams {
  tenantId: string;
  gateway: "paystack" | "flutterwave" | "stripe";
  amount: number;
  currency: string;
  customerEmail: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

/**
 * Gateway checkout initialisation.
 *
 * IMPORTANT (Phase 2): This path is SIMULATED only. It must never produce a
 * successful production financial outcome. Simulation is allowed only when
 * BuildVariantService.isSimulatorAllowed() is true (LOCAL, or STAGING with
 * ENABLE_SIMULATOR=true). PROD always fails closed.
 */
export class PaymentGatewayConvergenceService {
  static async initializeCheckout(params: CheckoutParams) {
    const { tenantId, gateway, amount, currency, customerEmail, metadata = {}, idempotencyKey } = params;
    const variant = BuildVariantService.getInstance();

    if (!variant.isSimulatorAllowed()) {
      const err: any = new Error(
        'Simulated payment gateway checkout is forbidden in this environment. Live gateway HTTP integration is not enabled.',
      );
      err.status = 403;
      throw err;
    }

    if (!amount || Number(amount) <= 0) {
      throw new Error('Invalid checkout amount');
    }

    if (idempotencyKey) {
      const { data: existingRows } = await supabase
        .from('transactions_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .contains('metadata', { idempotency_key: idempotencyKey })
        .limit(1);
      if (existingRows?.[0]) {
        return {
          reference: existingRows[0].reference,
          checkoutUrl: existingRows[0].metadata?.checkout_url,
          providerRef: existingRows[0].metadata?.provider_ref,
          simulated: true,
          idempotentReplay: true,
        };
      }
    }

    const txRef = `TX-${crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;

    console.log(`[GatewayConvergence] SIMULATED ${gateway.toUpperCase()} checkout for tenant ${tenantId}. Ref: ${txRef}`);

    // No mock production secrets. Simulation uses opaque placeholders only.
    let checkoutUrl = "";
    let providerRef = "";

    if (gateway === "paystack") {
      if (!process.env.PAYSTACK_SECRET_KEY && !variant.isLocal()) {
        const err: any = new Error('PAYSTACK_SECRET_KEY is not configured');
        err.status = 503;
        throw err;
      }
      providerRef = `pstk_sim_${crypto.randomBytes(8).toString("hex")}`;
      checkoutUrl = `https://checkout.paystack.com/${providerRef}`;
    } else if (gateway === "flutterwave") {
      if (!process.env.FLW_SECRET_KEY && !variant.isLocal()) {
        const err: any = new Error('FLW_SECRET_KEY is not configured');
        err.status = 503;
        throw err;
      }
      providerRef = `flw_sim_${crypto.randomBytes(8).toString("hex")}`;
      checkoutUrl = `https://checkout.flutterwave.com/pay/${providerRef}`;
    } else if (gateway === "stripe") {
      if (!process.env.STRIPE_SECRET_KEY && !variant.isLocal()) {
        const err: any = new Error('STRIPE_SECRET_KEY is not configured');
        err.status = 503;
        throw err;
      }
      providerRef = `pi_sim_${crypto.randomBytes(12).toString("hex")}`;
      checkoutUrl = `https://checkout.stripe.com/pay/${providerRef}`;
    } else {
      throw new Error(`Unsupported gateway: ${gateway}`);
    }

    // Persist as SIMULATED / PENDING only — never SUCCESS from this path
    const { error: dbError } = await supabase
      .from("transactions_log")
      .insert({
        reference: txRef,
        tenant_id: tenantId,
        amount: Math.round(amount),
        provider: gateway,
        status: "PENDING",
        type: "gateway_checkout",
        metadata: {
          ...metadata,
          simulated: true,
          customerEmail,
          currency,
          checkout_url: checkoutUrl,
          provider_ref: providerRef,
          ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        },
      });

    if (dbError) {
      console.error("[GatewayConvergence] DB write failed:", dbError.message);
    }

    await AuditService.log({
      eventType: "payment.gateway.simulated" as any,
      reference: txRef,
      tenantId,
      payload: { gateway, amount, currency, customerEmail, simulated: true },
    });

    return {
      reference: txRef,
      checkoutUrl,
      providerRef,
      simulated: true,
      warning: "Simulated checkout only — not a live payment authorization",
    };
  }

  /**
   * HMAC SHA-256 Webhook validation layer.
   */
  static verifyWebhookHMAC(payload: string, signature: string, secret: string, gateway: string): boolean {
    if (!signature || !secret) return false;

    try {
      if (gateway === "paystack" || gateway === "stripe") {
        const computed = crypto
          .createHmac("sha256", secret)
          .update(payload)
          .digest("hex");
        if (computed.length !== signature.length) return false;
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
      } else if (gateway === "flutterwave") {
        return signature === secret;
      }
      return false;
    } catch (err) {
      console.error("[GatewayConvergence] Webhook HMAC Verification Failure:", err);
      return false;
    }
  }

  /**
   * Replay-safe settlement clearing processing.
   */
  static async processSettlementWebhook(gateway: string, signature: string, payload: any) {
    const { LedgerService } = await import("./ledger.service");
    const { reference, status, amount, metadata } = payload.data || {};
    const tenantId = metadata?.tenantId || "default-tenant";

    console.log(`[GatewayConvergence] Processing ${gateway.toUpperCase()} webhook callback for ${reference}. Status: ${status}`);

    const idempotencyKey = `quasar:gateway:${gateway}:${reference}:settle`;
    if (await LedgerService.exists(idempotencyKey)) {
      console.warn(`[GatewayConvergence] Duplicate callback captured for reference: ${reference}. Suppressing replay.`);
      return { status: "already_processed" };
    }

    if (status === "success") {
      await LedgerService.createDoubleEntry({
        idempotencyKey,
        tenantId,
        reference,
        entries: [
          { account: "QUASAR_CLEARING", type: "DEBIT", amount },
          { account: "USER_WALLET", type: "CREDIT", amount }
        ],
        metadata: { source: "gateway_webhook", gateway }
      });

      await supabase
        .from("transactions_log")
        .update({ status: "SUCCESS", processed_at: new Date().toISOString() })
        .eq("reference", reference);

      await AuditService.log({
        eventType: "payment.success",
        reference,
        tenantId,
        payload: { amount, gateway }
      });
    }

    return { status: "processed" };
  }
}
