// invify-backend/src/controllers/school-payments.controller.ts
import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { AuditService } from '../services/audit.service';
import { resolveTenantScope } from '../utils/resolve-tenant-scope';

/** execute_sql wraps input as a subquery — close early, run DDL, comment trailer. */
function ddlInject(sql: string): string {
  return `select 1) t; ${sql}; SELECT json_build_object('ok', true) as val --`;
}

/**
 * School payments + disputes synced from the Flutter student profile
 * so tenant admin can audit Cash/POS and raised disputes on web.
 */
export class SchoolPaymentsController {
  private static tablesReady = false;

  private static async ensureTables(): Promise<void> {
    if (this.tablesReady) return;

    const ddl = `
      CREATE TABLE IF NOT EXISTS public.school_payment_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        local_invoice_number TEXT NOT NULL,
        sync_id TEXT,
        student_key TEXT,
        admission_number TEXT,
        student_name TEXT,
        class_name TEXT,
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_method TEXT,
        payment_status TEXT NOT NULL DEFAULT 'Paid',
        balance_before NUMERIC(12,2),
        credit_before NUMERIC(12,2),
        balance_after NUMERIC(12,2),
        credit_after NUMERIC(12,2),
        applied_to_bills NUMERIC(12,2),
        to_credit NUMERIC(12,2),
        remarks TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, local_invoice_number)
      );
      CREATE TABLE IF NOT EXISTS public.payment_disputes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        payment_event_id UUID,
        local_invoice_number TEXT NOT NULL,
        student_key TEXT,
        admission_number TEXT,
        student_name TEXT,
        amount NUMERIC(12,2),
        payment_method TEXT,
        reason TEXT NOT NULL,
        details TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        raised_by TEXT,
        resolved_by TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    try {
      const { error } = await supabaseAdmin.rpc('execute_sql', {
        query_text: ddlInject(ddl),
      });
      if (error) {
        console.warn('[SchoolPayments] ensureTables execute_sql:', error.message);
      } else {
        this.tablesReady = true;
      }
    } catch (e: any) {
      console.warn('[SchoolPayments] ensureTables failed:', e?.message || e);
    }
  }

  /**
   * POST /api/school/payments/sync
   * Upsert one or more student payment receipts from the device.
   */
  static async syncPayments(req: Request, res: Response) {
    try {
      await SchoolPaymentsController.ensureTables();
      const tenantId = resolveTenantScope(req);
      if (!tenantId) return res.status(401).json({ error: 'Tenant context missing' });

      const raw = req.body?.payments ?? req.body?.payment ?? req.body;
      const list = Array.isArray(raw) ? raw : [raw];
      if (!list.length) return res.status(400).json({ error: 'No payments provided' });

      const rows = list
        .map((p: any) => {
          const invoiceNumber = String(p.localInvoiceNumber || p.invoiceNumber || '').trim();
          if (!invoiceNumber) return null;
          const amount = Number(p.amount ?? p.amountPaid ?? p.totalAmount ?? 0);
          return {
            tenant_id: tenantId,
            local_invoice_number: invoiceNumber,
            sync_id: p.syncId || null,
            student_key: p.studentKey || (p.admissionNumber ? `stu-${p.admissionNumber}` : null),
            admission_number: p.admissionNumber || null,
            student_name: p.studentName || p.customerName || null,
            class_name: p.className || null,
            amount,
            payment_method: p.paymentMethod || null,
            payment_status: p.paymentStatus || 'Paid',
            balance_before: p.balanceBefore ?? null,
            credit_before: p.creditBefore ?? null,
            balance_after: p.balanceAfter ?? null,
            credit_after: p.creditAfter ?? null,
            applied_to_bills: p.appliedToBills ?? null,
            to_credit: p.toCredit ?? null,
            remarks: p.remarks || null,
            metadata: p.metadata || {},
            paid_at: p.paidAt || p.dateCreated || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (!rows.length) return res.status(400).json({ error: 'Invalid payment payload' });

      const { data, error } = await supabaseAdmin
        .from('school_payment_events')
        .upsert(rows, { onConflict: 'tenant_id,local_invoice_number' })
        .select('id, local_invoice_number, amount, payment_method, paid_at');

      if (error) {
        console.error('[SchoolPayments] syncPayments error:', error.message);
        return res.status(500).json({ error: error.message });
      }

      await AuditService.log({
        eventType: 'school.payment.synced' as any,
        reference: `SCH-PAY-${Date.now()}`,
        tenantId,
        payload: { count: rows.length, invoices: rows.map((r: any) => r.local_invoice_number) },
      });

      return res.status(200).json({ ok: true, synced: data?.length || rows.length, payments: data || [] });
    } catch (e: any) {
      console.error('[SchoolPayments] syncPayments:', e.message);
      return res.status(500).json({ error: e.message || 'Failed to sync school payments' });
    }
  }

  /**
   * GET /api/school/payments
   * Platform operators may pass ?allTenants=1 to list across schools.
   */
  static async listPayments(req: Request, res: Response) {
    try {
      await SchoolPaymentsController.ensureTables();
      const user = (req as any).user || {};
      const role = String(user.role || '').toLowerCase();
      const isPlatform = ['super_admin', 'admin', 'platform_admin', 'internal_staff', 'support'].includes(role);
      const allTenants =
        isPlatform &&
        (String(req.query.allTenants || '') === '1' ||
          String(req.query.scope || '').toLowerCase() === 'platform');

      const filterTenant = String(req.query.tenantId || '').trim();
      const tenantId = allTenants ? filterTenant : resolveTenantScope(req);
      if (!allTenants && !tenantId) {
        return res.status(401).json({ error: 'Tenant context missing' });
      }

      const admission = String(req.query.admissionNumber || '').trim();
      const method = String(req.query.method || '').trim();
      const limit = Math.min(Number(req.query.limit) || 200, 500);

      let query = supabaseAdmin
        .from('school_payment_events')
        .select('*')
        .order('paid_at', { ascending: false })
        .limit(limit);

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (admission) query = query.eq('admission_number', admission);
      if (method) query = query.ilike('payment_method', method);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      let payments = data || [];
      if (allTenants && payments.length) {
        const tenantIds = [...new Set(payments.map((p: any) => p.tenant_id).filter(Boolean))];
        const { data: tenants } = await supabaseAdmin
          .from('tenants')
          .select('id, name, business_name')
          .in('id', tenantIds);
        const map = new Map((tenants || []).map((t: any) => [t.id, t.business_name || t.name || t.id]));
        payments = payments.map((p: any) => ({
          ...p,
          tenant_name: map.get(p.tenant_id) || p.tenant_id,
        }));
      }

      return res.status(200).json({ payments, scope: allTenants ? 'platform' : 'tenant' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to list school payments' });
    }
  }

  /**
   * POST /api/school/payment-disputes
   */
  static async raiseDispute(req: Request, res: Response) {
    try {
      await SchoolPaymentsController.ensureTables();
      const tenantId = resolveTenantScope(req);
      if (!tenantId) return res.status(401).json({ error: 'Tenant context missing' });

      const body = req.body || {};
      const invoiceNumber = String(body.localInvoiceNumber || body.invoiceNumber || '').trim();
      const reason = String(body.reason || '').trim();
      if (!invoiceNumber || !reason) {
        return res.status(400).json({ error: 'invoiceNumber and reason are required' });
      }

      // Link to payment event when available
      const { data: payment } = await supabaseAdmin
        .from('school_payment_events')
        .select('id, amount, payment_method, student_name, admission_number, student_key')
        .eq('tenant_id', tenantId)
        .eq('local_invoice_number', invoiceNumber)
        .maybeSingle();

      const row = {
        tenant_id: tenantId,
        payment_event_id: payment?.id || null,
        local_invoice_number: invoiceNumber,
        student_key: body.studentKey || payment?.student_key || null,
        admission_number: body.admissionNumber || payment?.admission_number || null,
        student_name: body.studentName || payment?.student_name || null,
        amount: body.amount != null ? Number(body.amount) : payment?.amount ?? null,
        payment_method: body.paymentMethod || payment?.payment_method || null,
        reason,
        details: body.details || null,
        status: 'OPEN',
        raised_by: body.raisedBy || (req as any).user?.email || (req as any).user?.id || 'device',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('payment_disputes')
        .insert(row)
        .select('*')
        .single();

      if (error) {
        console.error('[SchoolPayments] raiseDispute error:', error.message);
        return res.status(500).json({ error: error.message });
      }

      await AuditService.log({
        eventType: 'school.payment.dispute' as any,
        reference: data.id,
        tenantId,
        payload: { invoiceNumber, reason, status: 'OPEN' },
      });

      return res.status(201).json({ dispute: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to raise dispute' });
    }
  }

  /**
   * GET /api/school/payment-disputes
   * Platform operators may pass ?allTenants=1 to list across schools.
   */
  static async listDisputes(req: Request, res: Response) {
    try {
      await SchoolPaymentsController.ensureTables();
      const user = (req as any).user || {};
      const role = String(user.role || '').toLowerCase();
      const isPlatform = ['super_admin', 'admin', 'platform_admin', 'internal_staff', 'support'].includes(role);
      const allTenants =
        isPlatform &&
        (String(req.query.allTenants || '') === '1' ||
          String(req.query.scope || '').toLowerCase() === 'platform');

      const filterTenant = String(req.query.tenantId || '').trim();
      const tenantId = allTenants ? filterTenant : resolveTenantScope(req);
      if (!allTenants && !tenantId) {
        return res.status(401).json({ error: 'Tenant context missing' });
      }

      const status = String(req.query.status || '').trim();
      const limit = Math.min(Number(req.query.limit) || 200, 500);

      let query = supabaseAdmin
        .from('payment_disputes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (tenantId) query = query.eq('tenant_id', tenantId);
      if (status && status.toUpperCase() !== 'ALL') {
        query = query.eq('status', status.toUpperCase());
      }

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      let disputes = data || [];
      if (allTenants && disputes.length) {
        const tenantIds = [...new Set(disputes.map((d: any) => d.tenant_id).filter(Boolean))];
        const { data: tenants } = await supabaseAdmin
          .from('tenants')
          .select('id, name, business_name')
          .in('id', tenantIds);
        const map = new Map((tenants || []).map((t: any) => [t.id, t.business_name || t.name || t.id]));
        disputes = disputes.map((d: any) => ({
          ...d,
          tenant_name: map.get(d.tenant_id) || d.tenant_id,
        }));
      }

      return res.status(200).json({ disputes, scope: allTenants ? 'platform' : 'tenant' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to list disputes' });
    }
  }

  /**
   * PATCH /api/school/payment-disputes/:id
   * Body: { status, resolutionNotes }
   */
  static async updateDispute(req: Request, res: Response) {
    try {
      await SchoolPaymentsController.ensureTables();
      const user = (req as any).user || {};
      const role = String(user.role || '').toLowerCase();
      const isPlatform = ['super_admin', 'admin', 'platform_admin', 'internal_staff', 'support'].includes(role);
      const tenantId = resolveTenantScope(req);

      const id = req.params.id;
      const status = String(req.body?.status || '').trim().toUpperCase();
      const allowed = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
      }

      const patch: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (req.body?.resolutionNotes != null) patch.resolution_notes = String(req.body.resolutionNotes);
      if (status === 'RESOLVED' || status === 'REJECTED') {
        patch.resolved_by = user.email || user.id || 'admin';
      }

      let query = supabaseAdmin.from('payment_disputes').update(patch).eq('id', id);
      if (!isPlatform) {
        if (!tenantId) return res.status(401).json({ error: 'Tenant context missing' });
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query.select('*').single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ dispute: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Failed to update dispute' });
    }
  }
}
