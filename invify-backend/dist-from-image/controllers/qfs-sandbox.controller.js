"use strict";
// src/controllers/qfs-sandbox.controller.ts
// Handles all /api/v1/sandbox/* routes.
// Auth: qfsApiKeyAuth middleware (sk_test_* API key, NOT admin JWT)
// Backend: Quasar Financial Sandbox by default (QFS_USE_QUASAR=true)
Object.defineProperty(exports, "__esModule", { value: true });
exports.QfsSandboxController = void 0;
const qfs_quasar_bridge_service_1 = require("../services/qfs-quasar-bridge.service");
function tenantId(req) {
    return req.qfsKey.tenantId;
}
function correlationId(req) {
    return req.headers['x-correlation-id'] || require('crypto').randomUUID();
}
exports.QfsSandboxController = {
    // GET /sandbox — session info
    async getSession(req, res) {
        try {
            const data = await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getSession(tenantId(req), req.qfsKey.keyId);
            res.json(data);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // POST /sandbox/bootstrap
    async bootstrap(req, res) {
        try {
            const { sandboxWebhookUrl, sandboxSocketChannel } = req.body;
            if (!sandboxWebhookUrl)
                return res.status(400).json({ error: 'sandboxWebhookUrl is required' });
            const data = await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.bootstrap(tenantId(req), sandboxWebhookUrl, sandboxSocketChannel);
            res.json(data);
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/config
    async getConfig(req, res) {
        try {
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getConfig(tenantId(req)));
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // PUT /sandbox/config
    async updateConfig(req, res) {
        try {
            const { webhookUrl, socketChannel, chaosMode } = req.body;
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.updateConfig(tenantId(req), { webhookUrl, socketChannel, chaosMode }));
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // POST /sandbox/config/generate-secret
    async generateSecret(req, res) {
        try {
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.generateSecret(tenantId(req)));
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/banks
    async getBanks(req, res) {
        try {
            res.json({ banks: await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getBanks(tenantId(req)) });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/bank-providers — providers with banks (pick before generate)
    async listBankProviders(req, res) {
        try {
            const { q } = req.query;
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.listBankProviders(tenantId(req), q));
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/bank/lookup?q=gtb&code=058
    async lookupBank(req, res) {
        try {
            const { q, code } = req.query;
            res.json({ banks: await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.lookupBanks(tenantId(req), q, code) });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // POST /sandbox/accounts/generate
    async generateAccount(req, res) {
        try {
            const { accountName, count = 1, bankCode, bankName, serviceSlug } = req.body;
            if (!accountName)
                return res.status(400).json({ error: 'accountName is required' });
            const result = await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.generateAccounts(tenantId(req), accountName, Number(count), bankCode, bankName, serviceSlug);
            res.status(201).json({
                accounts: result.accounts,
                backend: qfs_quasar_bridge_service_1.QfsQuasarBridgeService.isQuasarMode() ? 'quasar' : 'local',
                /** Exact body sent to Quasar POST /api/v1/sandbox/accounts/generate (null in local mode) */
                quasarPayload: result.quasarPayload,
            });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/accounts
    async listAccounts(req, res) {
        try {
            res.json({
                accounts: await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.listAccounts(tenantId(req)),
                backend: qfs_quasar_bridge_service_1.QfsQuasarBridgeService.isQuasarMode() ? 'quasar' : 'local',
            });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/accounts/:id
    async getAccount(req, res) {
        try {
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getAccount(tenantId(req), req.params.id));
        }
        catch (e) {
            res.status(404).json({ error: e.message });
        }
    },
    // POST /sandbox/accounts/:id/credit
    async creditAccount(req, res) {
        try {
            const { amount, reason, currency } = req.body;
            if (!amount || amount <= 0)
                return res.status(400).json({ error: 'amount (kobo) must be > 0' });
            if (!reason)
                return res.status(400).json({ error: 'reason is required' });
            const cid = correlationId(req);
            const result = await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.credit(tenantId(req), req.params.id, Number(amount), reason, currency, cid);
            res.setHeader('X-Correlation-Id', cid);
            res.json(result);
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
    },
    // POST /sandbox/accounts/:id/debit
    async debitAccount(req, res) {
        try {
            const { amount, reason, currency } = req.body;
            if (!amount || amount <= 0)
                return res.status(400).json({ error: 'amount (kobo) must be > 0' });
            if (!reason)
                return res.status(400).json({ error: 'reason is required' });
            const cid = correlationId(req);
            const result = await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.debit(tenantId(req), req.params.id, Number(amount), reason, currency, cid);
            res.setHeader('X-Correlation-Id', cid);
            res.json(result);
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
    },
    // GET /sandbox/accounts/:id/ledger
    async getLedger(req, res) {
        try {
            const { limit = '50', offset = '0' } = req.query;
            res.json({
                entries: await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getLedger(tenantId(req), req.params.id, Number(limit), Number(offset)),
            });
        }
        catch (e) {
            res.status(404).json({ error: e.message });
        }
    },
    // GET /sandbox/accounts/:id/balance-snapshots
    async getBalanceSnapshots(req, res) {
        try {
            res.json({
                snapshots: await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getBalanceSnapshots(tenantId(req), req.params.id),
            });
        }
        catch (e) {
            res.status(404).json({ error: e.message });
        }
    },
    // GET /sandbox/audit-logs
    async getAuditLogs(req, res) {
        try {
            const { limit = '50', offset = '0' } = req.query;
            res.json({
                logs: await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getAuditLogs(tenantId(req), Number(limit), Number(offset)),
            });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/timeline
    async getTimeline(req, res) {
        try {
            const { limit = '50' } = req.query;
            res.json({ events: await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getTimeline(tenantId(req), Number(limit)) });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/timeline/:correlationId
    async getTimelineByCorrelation(req, res) {
        try {
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getTimelineByCorrelation(tenantId(req), req.params.correlationId));
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/profiles
    async getProfiles(_req, res) {
        res.json({ profiles: qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getProfiles() });
    },
    // POST /sandbox/transfers
    async createTransfer(req, res) {
        try {
            if (!req.body.amountKobo && !req.body.amount) {
                return res.status(400).json({ error: 'amount or amountKobo is required' });
            }
            const cid = correlationId(req);
            req.body.correlationId = cid;
            const data = await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.createTransfer(tenantId(req), req.body);
            res.setHeader('X-Correlation-Id', cid);
            res.status(201).json(data);
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
    },
    // POST /sandbox/transfers/generate
    async generateTransfer(req, res) {
        try {
            const { profileId } = req.body;
            if (!profileId)
                return res.status(400).json({ error: 'profileId is required' });
            res.status(201).json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.generateTransfer(tenantId(req), profileId));
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
    },
    // GET /sandbox/transfers
    async listTransfers(req, res) {
        try {
            const { limit = '50', offset = '0' } = req.query;
            res.json({
                transfers: await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.listTransfers(tenantId(req), Number(limit), Number(offset)),
            });
        }
        catch (e) {
            res.status(500).json({ error: e.message });
        }
    },
    // GET /sandbox/transfers/:id
    async getTransfer(req, res) {
        try {
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getTransfer(tenantId(req), req.params.id));
        }
        catch (e) {
            res.status(404).json({ error: e.message });
        }
    },
    // POST /sandbox/transfers/:id/approve
    async approveTransfer(req, res) {
        try {
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.transitionTransfer(tenantId(req), req.params.id, 'approve'));
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
    },
    // POST /sandbox/transfers/:id/reject
    async rejectTransfer(req, res) {
        try {
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.transitionTransfer(tenantId(req), req.params.id, 'reject'));
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
    },
    // POST /sandbox/transfers/:id/reverse
    async reverseTransfer(req, res) {
        try {
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.transitionTransfer(tenantId(req), req.params.id, 'reverse'));
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
    },
    // GET /sandbox/providers
    async getProviders(_req, res) {
        const catalog = qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getProvidersCatalog();
        const providers = Object.entries(catalog).map(([key, val]) => ({ id: key, ...val }));
        res.json({ providers });
    },
    // GET /sandbox/providers/:provider
    async getProvider(req, res) {
        const catalog = qfs_quasar_bridge_service_1.QfsQuasarBridgeService.getProvidersCatalog();
        const psp = catalog[req.params.provider.toUpperCase()];
        if (!psp)
            return res.status(404).json({ error: 'Provider not found' });
        res.json({ id: req.params.provider.toUpperCase(), ...psp });
    },
    // POST /sandbox/providers/:provider/simulate
    async simulateProvider(req, res) {
        try {
            res.json(await qfs_quasar_bridge_service_1.QfsQuasarBridgeService.simulateProvider(tenantId(req), req.params.provider, req.body));
        }
        catch (e) {
            res.status(400).json({ error: e.message });
        }
    },
};
//# sourceMappingURL=qfs-sandbox.controller.js.map