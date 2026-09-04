import { Request, Response } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { resolveTenantScope } from '../utils/resolve-tenant-scope';
import { isMissingRelationError, serviceJobStatusBucket } from '../utils/service-job-status';

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pick(row: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return undefined;
}

export class ServicesDashboardController {
  static async getSummary(req: Request, res: Response) {
    const tenantId = resolveTenantScope(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

    try {
      const jobs = await ServicesDashboardController.loadJobs(tenantId, limit);
      let billed = 0;
      let collected = 0;
      let activeJobs = 0;
      let readyJobs = 0;

      for (const job of jobs) {
        billed += n(job.totalAmount);
        collected += n(job.amountPaid);
        const bucket = serviceJobStatusBucket(job.status);
        if (bucket === 'active') activeJobs += 1;
        if (bucket === 'ready') readyJobs += 1;
      }

      return res.status(200).json({
        source: jobs[0]?.source || 'none',
        totalJobs: jobs.length,
        activeJobs,
        readyJobs,
        billed,
        collected,
        recent: jobs.slice(0, 8),
        jobs,
      });
    } catch (error: any) {
      console.error('[ServicesDashboardController] Error:', error.message);
      return res.status(500).json({ error: 'Failed to load services dashboard' });
    }
  }

  static async syncJobs(req: Request, res: Response) {
    return ServicesDashboardController.upsertBatch(req, res, 'services_jobs', (job, tenantId) => ({
      id: String(pick(job, 'id') || ''),
      job_id: pick(job, 'job_id', 'jobId') || null,
      title: pick(job, 'title') || 'Service job',
      status: pick(job, 'status') || 'pending',
      total_amount: n(pick(job, 'total_amount', 'totalAmount')),
      amount_paid: n(pick(job, 'amount_paid', 'amountPaid')),
      labor_amount: n(pick(job, 'labor_amount', 'laborAmount')),
      balance: n(pick(job, 'balance')),
      customer_id: pick(job, 'customer_id', 'customerId') || null,
      customer_name: pick(job, 'customer_name', 'customerName') || null,
      description: pick(job, 'description') || null,
      due_date: pick(job, 'due_date', 'dueDate') || null,
      updated_at: pick(job, 'updated_at', 'updatedAt', 'created_at', 'createdAt') || new Date().toISOString(),
      created_at: pick(job, 'created_at', 'createdAt') || new Date().toISOString(),
      school_id: tenantId,
      tenant_id: tenantId,
    }), 'jobs');
  }

  static async syncPayments(req: Request, res: Response) {
    return ServicesDashboardController.upsertBatch(req, res, 'services_payments', (row, tenantId) => ({
      id: String(pick(row, 'id') || ''),
      job_id: pick(row, 'job_id', 'jobId') || null,
      amount: n(pick(row, 'amount')),
      method: pick(row, 'method') || 'other',
      reference: pick(row, 'reference') || null,
      created_at: pick(row, 'created_at', 'createdAt') || new Date().toISOString(),
      school_id: tenantId,
      tenant_id: tenantId,
    }), 'payments');
  }

  static async syncCustomers(req: Request, res: Response) {
    return ServicesDashboardController.upsertBatch(req, res, 'services_customers', (row, tenantId) => ({
      id: String(pick(row, 'id') || ''),
      name: pick(row, 'name') || 'Customer',
      phone: pick(row, 'phone') || null,
      email: pick(row, 'email') || null,
      address: pick(row, 'address') || null,
      created_at: pick(row, 'created_at', 'createdAt') || new Date().toISOString(),
      school_id: tenantId,
      tenant_id: tenantId,
    }), 'customers');
  }

  private static async upsertBatch(
    req: Request,
    res: Response,
    table: string,
    mapRow: (row: Record<string, any>, tenantId: string) => Record<string, any>,
    bodyKey: string,
  ) {
    const tenantId = resolveTenantScope(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const rows = req.body?.[bodyKey];
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: `invalid ${bodyKey} batch` });
    }

    try {
      const results = [];
      for (const row of rows) {
        const payload = mapRow(row || {}, tenantId);
        if (!payload.id) {
          results.push({ id: null, status: 'ignored (missing id)' });
          continue;
        }
        const { error } = await supabaseAdmin.from(table).upsert(payload);
        if (error) {
          if (isMissingRelationError(error)) {
            return res.status(503).json({ error: `${table} is not provisioned yet` });
          }
          throw error;
        }
        results.push({ id: payload.id, status: 'synced' });
      }
      return res.status(200).json({ success: true, results });
    } catch (error: any) {
      console.error(`[ServicesDashboardController] sync ${table}:`, error.message);
      return res.status(500).json({ error: error.message || `Failed to sync ${bodyKey}` });
    }
  }

  private static async loadJobs(tenantId: string, limit: number) {
    const fromSynced = await ServicesDashboardController.loadSyncedJobs(tenantId, limit);
    if (fromSynced.length > 0) return fromSynced;
    return ServicesDashboardController.loadInvoiceJobs(tenantId, limit);
  }

  private static async loadSyncedJobs(tenantId: string, limit: number) {
    const byTenant = await supabaseAdmin
      .from('services_jobs')
      .select('id, title, status, total_amount, amount_paid, customer_name, updated_at, created_at')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (!isMissingRelationError(byTenant.error) && byTenant.data?.length) {
      return ServicesDashboardController.mapJobRows(byTenant.data, 'jobs');
    }

    const bySchool = await supabaseAdmin
      .from('services_jobs')
      .select('id, title, status, total_amount, amount_paid, customer_name, updated_at, created_at')
      .eq('school_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (isMissingRelationError(bySchool.error) || isMissingRelationError(byTenant.error)) {
      return [];
    }

    return ServicesDashboardController.mapJobRows(bySchool.data || [], 'jobs');
  }

  private static async loadInvoiceJobs(tenantId: string, limit: number) {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      title: row.invoice_number || row.customer_name || row.metadata?.customer_name || 'Service invoice',
      customerName: row.customer_name || row.metadata?.customer_name || '',
      status: row.payment_status || row.status || 'unpaid',
      totalAmount: n(row.total_amount),
      amountPaid: n(row.amount_paid),
      updatedAt: row.updated_at || row.created_at,
      source: 'invoices' as const,
    }));
  }

  private static mapJobRows(rows: any[], source: 'jobs') {
    return rows.map((row) => ({
      id: row.id,
      title: row.title || row.customer_name || 'Service job',
      customerName: row.customer_name || '',
      status: row.status || 'pending',
      totalAmount: n(row.total_amount),
      amountPaid: n(row.amount_paid),
      updatedAt: row.updated_at || row.created_at,
      source,
    }));
  }
}
