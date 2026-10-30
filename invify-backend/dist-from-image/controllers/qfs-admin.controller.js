"use strict";
// src/controllers/qfs-admin.controller.ts
// Admin-only QFS routes: API key provisioning, webhook log, health, analytics.
// Auth: standard admin JWT (authenticate + checkRole)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QfsAdminController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../db/supabase");
function hashKey(raw) {
    return crypto_1.default.createHash('sha256').update(raw).digest('hex');
}
exports.QfsAdminController = {
    // POST /api/v1/admin/qfs/keys — provision a new sk_test_* key for a tenant
    async createApiKey(req, res) {
        try {
            const { tenantId, label, scopes = ['sandbox:read', 'sandbox:write'], expiresAt } = req.body;
            if (!tenantId)
                return res.status(400).json({ error: 'tenantId is required' });
            // Verify tenant exists
            const { data: tenant, error: tenantErr } = await supabase_1.supabaseAdmin.from('tenants').select('id, name').eq('id', tenantId).single();
            if (tenantErr || !tenant)
                return res.status(404).json({ error: 'Tenant not found' });
            // Generate key
            const rawKey = 'sk_test_' + crypto_1.default.randomBytes(24).toString('hex');
            const keyHash = hashKey(rawKey);
            const keyPrefix = rawKey.substring(0, 12) + '...';
            const { data, error } = await supabase_1.supabaseAdmin.from('qfs_api_keys').insert({
                tenant_id: tenantId,
                key_hash: keyHash,
                key_prefix: keyPrefix,
                environment: 'test',
                scopes,
                label: label || `${tenant.name} Sandbox Key`,
                is_active: true,
                expires_at: expiresAt || null,
            }).select().single();
            if (error)
                throw new Error(error.message);
            // Return raw key ONCE — never stored in plaintext
            res.status(201).json({
                id: data.id,
                tenantId,
                tenantName: tenant.name,
                apiKey: rawKey, // Shown ONCE — copy now
                keyPrefix,
                scopes,
                label: data.label,
                environment: 'test',
                note: 'Copy apiKey now. It will NOT be shown again. Store as your QUASAR_API_KEY.',
            });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /api/v1/admin/qfs/keys
    async listApiKeys(req, res) {
        try {
            const { tenantId } = req.query;
            let query = supabase_1.supabaseAdmin.from('qfs_api_keys').select('id, tenant_id, key_prefix, scopes, label, environment, is_active, last_used_at, created_at, expires_at');
            if (tenantId)
                query = query.eq('tenant_id', tenantId);
            const { data } = await query.order('created_at', { ascending: false });
            res.json({ keys: data || [] });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // DELETE /api/v1/admin/qfs/keys/:id — revoke key
    async revokeApiKey(req, res) {
        try {
            const { error } = await supabase_1.supabaseAdmin.from('qfs_api_keys').update({ is_active: false }).eq('id', req.params.id);
            if (error)
                throw new Error(error.message);
            res.json({ revoked: true, id: req.params.id });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /api/v1/admin/financial-sandbox/webhooks
    async listWebhooks(req, res) {
        try {
            const { tenantId, status, limit = '50', offset = '0' } = req.query;
            let query = supabase_1.supabaseAdmin.from('qfs_sandbox_webhooks').select('*');
            if (tenantId)
                query = query.eq('tenant_id', tenantId);
            if (status)
                query = query.eq('status', status);
            const { data } = await query.order('created_at', { ascending: false }).range(Number(offset), Number(offset) + Number(limit) - 1);
            res.json({ webhooks: data || [] });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /api/v1/admin/financial-sandbox/webhooks/:id
    async getWebhook(req, res) {
        try {
            const { data, error } = await supabase_1.supabaseAdmin.from('qfs_sandbox_webhooks').select('*').eq('id', req.params.id).single();
            if (error || !data)
                return res.status(404).json({ error: 'Webhook not found' });
            res.json(data);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // POST /api/v1/admin/financial-sandbox/webhooks/:id/replay
    async replayWebhook(req, res) {
        try {
            const { data: webhook, error } = await supabase_1.supabaseAdmin.from('qfs_sandbox_webhooks').select('*').eq('id', req.params.id).single();
            if (error || !webhook)
                return res.status(404).json({ error: 'Webhook not found' });
            // Re-insert as a new delivery attempt with a new correlation ID
            const newCorrelationId = crypto_1.default.randomUUID();
            const { data: newWebhook } = await supabase_1.supabaseAdmin.from('qfs_sandbox_webhooks').insert({
                tenant_id: webhook.tenant_id,
                event_type: webhook.event_type,
                correlation_id: newCorrelationId,
                transfer_id: webhook.transfer_id,
                payload: { ...webhook.payload, _replay: true, _originalId: webhook.id },
                delivery_url: webhook.delivery_url,
                status: 'pending',
                attempts: 0,
            }).select().single();
            res.json({ replayed: true, originalId: req.params.id, newWebhookId: newWebhook?.id, correlationId: newCorrelationId });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /api/v1/admin/financial-sandbox/health
    async getHealth(req, res) {
        try {
            const [accounts, transfers, webhooks, apiKeys] = await Promise.all([
                supabase_1.supabaseAdmin.from('qfs_sandbox_accounts').select('id', { count: 'exact', head: true }),
                supabase_1.supabaseAdmin.from('qfs_sandbox_transfers').select('id', { count: 'exact', head: true }),
                supabase_1.supabaseAdmin.from('qfs_sandbox_webhooks').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
                supabase_1.supabaseAdmin.from('qfs_api_keys').select('id', { count: 'exact', head: true }).eq('is_active', true),
            ]);
            res.json({
                status: 'healthy',
                totalAccounts: accounts.count || 0,
                totalTransfers: transfers.count || 0,
                failedWebhooks: webhooks.count || 0,
                activeApiKeys: apiKeys.count || 0,
                timestamp: new Date().toISOString(),
            });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /api/v1/admin/financial-sandbox/analytics
    async getAnalytics(req, res) {
        try {
            const { data: transferStats } = await supabase_1.supabaseAdmin
                .from('qfs_sandbox_transfers')
                .select('status, amount_kobo');
            const stats = { pending: 0, success: 0, failed: 0, reversed: 0, rejected: 0, totalVolumeKobo: 0 };
            (transferStats || []).forEach(t => {
                if (t.status in stats)
                    stats[t.status]++;
                if (t.status === 'success')
                    stats.totalVolumeKobo += t.amount_kobo || 0;
            });
            res.json({ transfers: stats, timestamp: new Date().toISOString() });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
};
//# sourceMappingURL=qfs-admin.controller.js.map