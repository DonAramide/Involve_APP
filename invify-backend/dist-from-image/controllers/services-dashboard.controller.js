"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesDashboardController = void 0;
const supabase_1 = require("../db/supabase");
const resolve_tenant_scope_1 = require("../utils/resolve-tenant-scope");
const invoice_collection_1 = require("../utils/invoice-collection");
const service_job_status_1 = require("../utils/service-job-status");
function n(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
function pick(row, ...keys) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '')
            return row[key];
    }
    return undefined;
}
class ServicesDashboardController {
    static async getSummary(req, res) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
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
                collected += job.source === 'invoices'
                    ? (0, invoice_collection_1.collectedInvoiceAmount)({
                        amount_paid: job.amountPaid,
                        payment_status: job.status,
                    })
                    : n(job.amountPaid);
                const bucket = (0, service_job_status_1.serviceJobStatusBucket)(job.status);
                if (bucket === 'active')
                    activeJobs += 1;
                if (bucket === 'ready')
                    readyJobs += 1;
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
        }
        catch (error) {
            console.error('[ServicesDashboardController] Error:', error.message);
            return res.status(500).json({ error: 'Failed to load services dashboard' });
        }
    }
    static async syncJobs(req, res) {
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
    static async syncPayments(req, res) {
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
    static async syncCustomers(req, res) {
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
    static async upsertBatch(req, res, table, mapRow, bodyKey) {
        const tenantId = (0, resolve_tenant_scope_1.resolveTenantScope)(req);
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
                const { error } = await supabase_1.supabaseAdmin.from(table).upsert(payload);
                if (error) {
                    if ((0, service_job_status_1.isMissingRelationError)(error)) {
                        return res.status(503).json({ error: `${table} is not provisioned yet` });
                    }
                    throw error;
                }
                results.push({ id: payload.id, status: 'synced' });
            }
            return res.status(200).json({ success: true, results });
        }
        catch (error) {
            console.error(`[ServicesDashboardController] sync ${table}:`, error.message);
            return res.status(500).json({ error: error.message || `Failed to sync ${bodyKey}` });
        }
    }
    static async loadJobs(tenantId, limit) {
        const fromSynced = await ServicesDashboardController.loadSyncedJobs(tenantId, limit);
        if (fromSynced.length > 0)
            return fromSynced;
        return ServicesDashboardController.loadInvoiceJobs(tenantId, limit);
    }
    static async loadSyncedJobs(tenantId, limit) {
        const byTenant = await supabase_1.supabaseAdmin
            .from('services_jobs')
            .select('id, title, status, total_amount, amount_paid, customer_name, updated_at, created_at')
            .eq('tenant_id', tenantId)
            .order('updated_at', { ascending: false })
            .limit(limit);
        if (!(0, service_job_status_1.isMissingRelationError)(byTenant.error) && byTenant.data?.length) {
            return ServicesDashboardController.mapJobRows(byTenant.data, 'jobs');
        }
        const bySchool = await supabase_1.supabaseAdmin
            .from('services_jobs')
            .select('id, title, status, total_amount, amount_paid, customer_name, updated_at, created_at')
            .eq('school_id', tenantId)
            .order('updated_at', { ascending: false })
            .limit(limit);
        if ((0, service_job_status_1.isMissingRelationError)(bySchool.error) || (0, service_job_status_1.isMissingRelationError)(byTenant.error)) {
            return [];
        }
        return ServicesDashboardController.mapJobRows(bySchool.data || [], 'jobs');
    }
    static async loadInvoiceJobs(tenantId, limit) {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error || !data)
            return [];
        return data.map((row) => ({
            id: row.id,
            title: row.invoice_number || row.customer_name || row.metadata?.customer_name || 'Service invoice',
            customerName: row.customer_name || row.metadata?.customer_name || '',
            status: row.payment_status || row.status || 'unpaid',
            totalAmount: n(row.total_amount),
            amountPaid: n(row.amount_paid),
            updatedAt: row.updated_at || row.created_at,
            source: 'invoices',
        }));
    }
    static mapJobRows(rows, source) {
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
exports.ServicesDashboardController = ServicesDashboardController;
//# sourceMappingURL=services-dashboard.controller.js.map