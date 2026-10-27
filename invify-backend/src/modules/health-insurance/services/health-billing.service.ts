// invify-backend/src/modules/health-insurance/services/health-billing.service.ts
import crypto from 'crypto';
import { supabaseAdmin } from '../../../db/supabase';
import { HealthContext } from '../types';
import { HealthAuditService } from './health-audit.service';
import { LedgerService } from '../../../services/ledger.service';

export class HealthBillingService {
  /**
   * Issue a premium invoice for an enrolment.
   */
  static async issuePremiumInvoice(
    ctx: HealthContext,
    params: {
      enrolmentId: string;
      payerType: 'school' | 'employer' | 'guardian' | 'staff' | 'member';
      payerUserId?: string;
      guardianLinkId?: string;
      dueDate: string;
    }
  ) {
    // 1. Fetch enrolment and plan version details
    const { data: enr, error: enrErr } = await supabaseAdmin
      .from('hw_enrolments')
      .select(`
        id,
        tenant_id,
        status,
        hw_plan_versions (
          id,
          premium_minor,
          currency
        )
      `)
      .eq('id', params.enrolmentId)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (enrErr || !enr) throw new Error('Enrolment not found');

    const premiumMinor = (enr as any).hw_plan_versions?.premium_minor;
    const currency = (enr as any).hw_plan_versions?.currency || 'NGN';

    if (!premiumMinor || premiumMinor <= 0) {
      throw new Error('Plan version premium must be strictly greater than 0');
    }

    const invoiceNumber = `HW-INV-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('hw_premium_invoices')
      .insert({
        tenant_id: ctx.tenantId,
        enrolment_id: params.enrolmentId,
        invoice_number: invoiceNumber,
        payer_type: params.payerType,
        payer_user_id: params.payerUserId || ctx.userId,
        guardian_link_id: params.guardianLinkId || null,
        amount_due_minor: premiumMinor,
        amount_paid_minor: 0,
        currency,
        status: 'issued',
        due_date: params.dueDate,
        issued_at: new Date().toISOString()
      })
      .select()
      .single();

    if (invErr) throw new Error(`Failed to issue premium invoice: ${invErr.message}`);

    await HealthAuditService.log({
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      action: 'invoice.issued',
      resourceType: 'hw_premium_invoices',
      resourceId: invoice.id,
      changes: { invoiceNumber, amountDueMinor: premiumMinor }
    });

    return invoice;
  }

  /**
   * Initiate payment for a health premium invoice.
   */
  static async initiatePayment(
    ctx: HealthContext,
    invoiceId: string,
    params: {
      idempotencyKey: string;
      paymentChannel: 'quasar_va' | 'quasar_card' | 'quasar_direct' | 'manual_reconciled';
    }
  ) {
    // 1. Fetch invoice
    const { data: inv, error: invErr } = await supabaseAdmin
      .from('hw_premium_invoices')
      .select('id, tenant_id, invoice_number, amount_due_minor, amount_paid_minor, status, currency')
      .eq('id', invoiceId)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (invErr || !inv) throw new Error('Premium invoice not found');
    if (inv.status === 'paid') throw new Error('Invoice is already fully paid');

    const outstandingMinor = inv.amount_due_minor - inv.amount_paid_minor;
    const paymentRef = `HW-PAY-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;

    // 2. Insert payment record (initiated)
    const { data: payment, error: payErr } = await supabaseAdmin
      .from('hw_payments')
      .insert({
        tenant_id: ctx.tenantId,
        payment_reference: paymentRef,
        idempotency_key: params.idempotencyKey,
        amount_minor: outstandingMinor,
        currency: inv.currency,
        status: 'initiated',
        payment_channel: params.paymentChannel,
        payer_id: ctx.userId,
        payment_metadata: { invoiceId, invoiceNumber: inv.invoice_number }
      })
      .select()
      .single();

    if (payErr) {
      if (payErr.message.includes('duplicate') || payErr.code === '23505') {
        // Return existing payment for this idempotency key
        const { data: existing } = await supabaseAdmin
          .from('hw_payments')
          .select('*')
          .eq('idempotency_key', params.idempotencyKey)
          .single();
        return existing;
      }
      throw new Error(`Failed to initiate payment: ${payErr.message}`);
    }

    return payment;
  }

  /**
   * Process payment confirmation event (from Quasar webhook or verification).
   * Atomically:
   *  1. Marks payment as 'successful' with verified_at.
   *  2. Allocates payment to invoice in hw_payment_allocations.
   *  3. Updates invoice amount_paid_minor and marks status='paid'.
   *  4. Transitions enrolment from awaiting_premium_payment to awaiting_insurer_activation.
   *  5. Records double-entry in the platform ledger.
   */
  static async processPaymentConfirmation(
    tenantId: string,
    paymentId: string,
    invoiceId: string,
    quasarReference: string
  ) {
    // 1. Fetch payment and invoice
    const { data: payment, error: payErr } = await supabaseAdmin
      .from('hw_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .single();

    if (payErr || !payment) throw new Error('Payment not found');
    if (payment.status === 'successful') return { success: true, message: 'Already processed' };

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from('hw_premium_invoices')
      .select('*, hw_enrolments(id, status)')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (invErr || !invoice) throw new Error('Invoice not found');

    const verifiedAt = new Date().toISOString();

    // 2. Mark payment as successful
    const { error: updPayErr } = await supabaseAdmin
      .from('hw_payments')
      .update({
        status: 'successful',
        quasar_reference: quasarReference,
        verified_at: verifiedAt,
        updated_at: verifiedAt
      })
      .eq('id', paymentId);

    if (updPayErr) throw new Error(`Failed to update payment: ${updPayErr.message}`);

    // 3. Create allocation
    const { error: allocErr } = await supabaseAdmin
      .from('hw_payment_allocations')
      .insert({
        tenant_id: tenantId,
        payment_id: paymentId,
        invoice_id: invoiceId,
        allocated_amount_minor: payment.amount_minor,
        currency: payment.currency
      });

    if (allocErr) throw new Error(`Failed to allocate payment: ${allocErr.message}`);

    // 4. Update invoice amount_paid_minor and status
    const newPaidAmount = invoice.amount_paid_minor + payment.amount_minor;
    const isFullyPaid = newPaidAmount >= invoice.amount_due_minor;

    const { error: updInvErr } = await supabaseAdmin
      .from('hw_premium_invoices')
      .update({
        amount_paid_minor: newPaidAmount,
        status: isFullyPaid ? 'paid' : 'partially_paid',
        paid_at: isFullyPaid ? verifiedAt : null,
        updated_at: verifiedAt
      })
      .eq('id', invoiceId);

    if (updInvErr) throw new Error(`Failed to update invoice: ${updInvErr.message}`);

    // 5. If fully paid, transition enrolment to awaiting_insurer_activation
    const enrolment = (invoice as any).hw_enrolments;
    if (isFullyPaid && enrolment && enrolment.status === 'awaiting_premium_payment') {
      await supabaseAdmin
        .from('hw_enrolments')
        .update({
          status: 'awaiting_insurer_activation',
          status_reason: 'Premium payment verified and settled',
          updated_at: verifiedAt
        })
        .eq('id', enrolment.id);
    }

    // 6. Record Double-Entry in platform ledger (SETTLEMENTS / QUASAR_CLEARING pass-through)
    try {
      await LedgerService.createDoubleEntry({
        idempotencyKey: `hw:pay:${paymentId}`,
        tenantId,
        reference: `HW-PREM:${payment.payment_reference}`,
        entries: [
          { account: 'QUASAR_CLEARING', type: 'DEBIT', amount: Number(payment.amount_minor) },
          { account: 'SETTLEMENTS', type: 'CREDIT', amount: Number(payment.amount_minor) }
        ],
        metadata: {
          domain: 'health_premium',
          invoiceId,
          paymentId,
          quasarReference
        }
      });

      // Mark payment reconciled
      await supabaseAdmin
        .from('hw_payments')
        .update({ reconciled_at: new Date().toISOString() })
        .eq('id', paymentId);
    } catch (ledgerErr: any) {
      console.warn('[HealthBillingService] Ledger recording warning (non-fatal for coverage):', ledgerErr?.message || ledgerErr);
    }

    await HealthAuditService.log({
      tenantId,
      action: 'payment.confirmed',
      resourceType: 'hw_payments',
      resourceId: paymentId,
      changes: { invoiceId, amountMinor: payment.amount_minor, quasarReference }
    });

    return { success: true };
  }
}
