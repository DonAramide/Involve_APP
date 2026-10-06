import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { BillingInvariantError, nairaStringToKobo } from '../modules/tenant-billing/tenant-billing.engine';
import { Actor, TenantBillingService } from '../modules/tenant-billing/tenant-billing.service';
import { getTenantBillingService } from '../modules/tenant-billing/tenant-billing.runtime';
import { GovAuditService } from '../services/gov-audit.service';

async function tenantNameById(ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))];
  const names = new Map<string, string>();
  if (!unique.length) return names;
  try {
    let rows: Array<{ id: string; name?: string; business_name?: string }> | null = null;
    const first = await supabaseAdmin.from('tenants').select('id, name, business_name').in('id', unique);
    if (first.error && /business_name/i.test(first.error.message)) {
      const retry = await supabaseAdmin.from('tenants').select('id, name').in('id', unique);
      rows = (retry.data || []) as any;
    } else {
      rows = (first.data || []) as any;
    }
    for (const row of rows || []) {
      const label = String((row as any).business_name || row.name || '').trim();
      if (label) names.set(String(row.id), label);
    }
  } catch {
    // Memory/local tests still return billing rows without a name lookup.
  }
  return names;
}

function withTenantName<T extends { tenantId?: string }>(row: T, names: Map<string, string>): T & { tenantName: string } {
  const tenantId = String(row?.tenantId || '');
  return { ...row, tenantName: names.get(tenantId) || tenantId };
}

function actor(req: Request): Actor {
  const user = (req as any).user || {};
  return {
    id: user.id || 'unknown',
    email: user.email || 'unknown',
    role: String(user.role || ''),
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress,
  };
}

function kobo(body: any, field = 'amountKobo'): number {
  if (body?.[field] != null) return Number(body[field]);
  if (body?.amountNaira != null) return nairaStringToKobo(String(body.amountNaira));
  throw new BillingInvariantError('amountKobo or amountNaira is required');
}

function fail(res: Response, err: any) {
  const status = err?.code === 'TENANT_ISOLATION' ? 403 : 400;
  return res.status(status).json({ success: false, error: err?.message || 'Billing error', code: err?.code });
}

export class TenantBillingController {
  static service(): TenantBillingService {
    return getTenantBillingService();
  }

  static async ready(): Promise<TenantBillingService> {
    const svc = getTenantBillingService();
    await svc.store.hydrate();
    return svc;
  }

  static async overview(_req: Request, res: Response) {
    const svc = await TenantBillingController.ready();
    return res.json({ success: true, data: svc.overview() });
  }

  static async accounts(_req: Request, res: Response) {
    const svc = await TenantBillingController.ready();
    const rows = [...svc.store.accounts.values()];
    const names = await tenantNameById(rows.map((r) => r.tenantId));
    return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
  }

  static async ensureAccount(req: Request, res: Response) {
    try {
      const tenantId = String(req.body.tenantId || '');
      if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
      const svc = await TenantBillingController.ready();
      const account = svc.ensureAccount(tenantId, req.body.currency || 'NGN');
      await svc.store.persistEntities();
      return res.json({ success: true, data: account });
    } catch (e) {
      return fail(res, e);
    }
  }

  static async obligations(req: Request, res: Response) {
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : null;
    const svc = await TenantBillingController.ready();
    const rows = [...svc.store.obligations.values()].filter(
      (o) => !tenantId || o.tenantId === tenantId,
    );
    const names = await tenantNameById(rows.map((r) => r.tenantId));
    return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
  }

  static async createObligation(req: Request, res: Response) {
    try {
      const svc = await TenantBillingController.ready();
      const data = svc.createObligation({
        tenantId: req.body.tenantId,
        type: req.body.type,
        description: req.body.description,
        grossAmountKobo: kobo(req.body, 'grossAmountKobo'),
        dueDate: req.body.dueDate,
        deviceId: req.body.deviceId,
        actor: actor(req),
      });
      await svc.store.persistEntities();
      await GovAuditService.logAction({
        module: 'FINANCIAL',
        action: 'CREATE_OBLIGATION',
        user_email: actor(req).email,
        ip_address: actor(req).ip || '',
        target: data.id,
        tenant_id: data.tenantId,
        metadata: { type: data.type, grossAmountKobo: data.grossAmountKobo },
      } as any);
      return res.status(201).json({ success: true, data });
    } catch (e) {
      return fail(res, e);
    }
  }

  static async createPlan(req: Request, res: Response) {
    try {
      const svc = await TenantBillingController.ready();
      const data = svc.createDeviceInstallmentPlan({
        tenantId: req.body.tenantId,
        deviceId: req.body.deviceId,
        description: req.body.description || 'Invify Box installment',
        purchasePriceKobo: kobo(req.body, 'purchasePriceKobo'),
        downPaymentKobo: Number(req.body.downPaymentKobo || 0),
        installmentKobo: kobo(req.body, 'installmentKobo'),
        firstDueDate: req.body.firstDueDate,
        serialNumber: req.body.serialNumber,
        actor: actor(req),
      });
      await svc.store.persistEntities();
      return res.status(201).json({ success: true, data });
    } catch (e) {
      return fail(res, e);
    }
  }

  static async createSubscription(req: Request, res: Response) {
    try {
      const svc = await TenantBillingController.ready();
      const data = svc.createSubscription({
        tenantId: req.body.tenantId,
        planName: req.body.planName,
        amountKobo: kobo(req.body),
        nextDue: req.body.nextDue,
        actor: actor(req),
      });
      await svc.store.persistEntities();
      return res.status(201).json({ success: true, data });
    } catch (e) {
      return fail(res, e);
    }
  }

  static async previewPayment(req: Request, res: Response) {
    try {
      const svc = await TenantBillingController.ready();
      const data = svc.previewPayment({
        tenantId: req.body.tenantId,
        obligationId: req.body.obligationId,
        installmentId: req.body.installmentId,
        amountKobo: kobo(req.body),
        allowFutureWhileOverdue: !!req.body.allowFutureWhileOverdue,
      });
      return res.json({ success: true, data });
    } catch (e) {
      return fail(res, e);
    }
  }

  static async postPayment(req: Request, res: Response) {
    try {
      const svc = await TenantBillingController.ready();
      const result = await svc.postPayment({
        tenantId: req.body.tenantId,
        amountKobo: kobo(req.body),
        method: req.body.method,
        reference: req.body.reference,
        paymentDate: req.body.paymentDate,
        notes: req.body.notes,
        obligationId: req.body.obligationId,
        installmentId: req.body.installmentId,
        idempotencyKey: req.body.idempotencyKey,
        confirm: req.body.confirm !== false,
        actor: actor(req),
        allowFutureWhileOverdue: !!req.body.allowFutureWhileOverdue,
      });
      await GovAuditService.logAction({
        module: 'FINANCIAL',
        action: result.duplicate ? 'POST_PAYMENT_IDEMPOTENT' : 'POST_PAYMENT',
        user_email: actor(req).email,
        ip_address: actor(req).ip || '',
        target: result.payment.id,
        tenant_id: result.payment.tenantId,
        metadata: {
          reference: result.payment.reference,
          amountKobo: result.payment.amountKobo,
          method: result.payment.method,
        },
      } as any);
      return res.status(result.duplicate ? 200 : 201).json({ success: true, data: result });
    } catch (e) {
      return fail(res, e);
    }
  }

  static async reversePayment(req: Request, res: Response) {
    try {
      const svc = await TenantBillingController.ready();
      const data = await svc.reversePaymentRemote({
        paymentId: req.params.id,
        tenantId: req.body.tenantId,
        reason: req.body.reason || 'reversal',
        actor: actor(req),
      });
      await GovAuditService.logAction({
        module: 'FINANCIAL',
        action: 'REVERSE_PAYMENT',
        user_email: actor(req).email,
        ip_address: actor(req).ip || '',
        target: req.params.id,
        tenant_id: req.body.tenantId,
        metadata: { reason: req.body.reason },
      } as any);
      return res.json({ success: true, data });
    } catch (e) {
      return fail(res, e);
    }
  }

  static async tenantProfile(req: Request, res: Response) {
    const svc = await TenantBillingController.ready();
    const data = svc.tenantProfile(req.params.tenantId);
    const names = await tenantNameById([req.params.tenantId]);
    return res.json({
      success: true,
      data: { ...data, tenantName: names.get(String(req.params.tenantId)) || req.params.tenantId },
    });
  }

  static async reports(req: Request, res: Response) {
    const kind = String(req.query.kind || 'outstanding');
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
    const svc = await TenantBillingController.ready();
    return res.json({ success: true, data: svc.reports(kind, { tenantId }) });
  }

  static async overdue(_req: Request, res: Response) {
    const svc = await TenantBillingController.ready();
    const rows = svc.reports('overdue') as Array<{ tenantId: string }>;
    const names = await tenantNameById(rows.map((r) => r.tenantId));
    return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
  }

  static async payments(req: Request, res: Response) {
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
    const svc = await TenantBillingController.ready();
    const rows = svc.reports('payments', { tenantId }) as Array<{ tenantId: string }>;
    const names = await tenantNameById(rows.map((r) => r.tenantId));
    return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
  }

  static async installments(req: Request, res: Response) {
    const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
    const svc = await TenantBillingController.ready();
    const rows = svc.reports('installments', { tenantId }) as Array<{ tenantId: string }>;
    const names = await tenantNameById(rows.map((r) => r.tenantId));
    return res.json({ success: true, data: rows.map((r) => withTenantName(r, names)) });
  }
}
