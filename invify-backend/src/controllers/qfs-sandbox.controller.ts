// src/controllers/qfs-sandbox.controller.ts
// Handles all /api/v1/sandbox/* routes.
// Auth: qfsApiKeyAuth middleware (sk_test_* API key, NOT admin JWT)
// Backend: Quasar Financial Sandbox by default (QFS_USE_QUASAR=true)

import { Request, Response } from 'express';
import { QfsQuasarBridgeService } from '../services/qfs-quasar-bridge.service';

function tenantId(req: Request): string {
  return req.qfsKey!.tenantId;
}

function correlationId(req: Request): string {
  return (req.headers['x-correlation-id'] as string) || require('crypto').randomUUID();
}

export const QfsSandboxController = {

  // GET /sandbox — session info
  async getSession(req: Request, res: Response) {
    try {
      const data = await QfsQuasarBridgeService.getSession(tenantId(req), req.qfsKey!.keyId);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // POST /sandbox/bootstrap
  async bootstrap(req: Request, res: Response) {
    try {
      const { sandboxWebhookUrl, sandboxSocketChannel } = req.body;
      if (!sandboxWebhookUrl) return res.status(400).json({ error: 'sandboxWebhookUrl is required' });
      const data = await QfsQuasarBridgeService.bootstrap(tenantId(req), sandboxWebhookUrl, sandboxSocketChannel);
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/config
  async getConfig(req: Request, res: Response) {
    try {
      res.json(await QfsQuasarBridgeService.getConfig(tenantId(req)));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // PUT /sandbox/config
  async updateConfig(req: Request, res: Response) {
    try {
      const { webhookUrl, socketChannel, chaosMode } = req.body;
      res.json(await QfsQuasarBridgeService.updateConfig(tenantId(req), { webhookUrl, socketChannel, chaosMode }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // POST /sandbox/config/generate-secret
  async generateSecret(req: Request, res: Response) {
    try {
      res.json(await QfsQuasarBridgeService.generateSecret(tenantId(req)));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/banks
  async getBanks(req: Request, res: Response) {
    try {
      res.json({ banks: await QfsQuasarBridgeService.getBanks(tenantId(req)) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/bank-providers — providers with banks (pick before generate)
  async listBankProviders(req: Request, res: Response) {
    try {
      const { q } = req.query as { q?: string };
      res.json(await QfsQuasarBridgeService.listBankProviders(tenantId(req), q));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/bank/lookup?q=gtb&code=058
  async lookupBank(req: Request, res: Response) {
    try {
      const { q, code } = req.query as { q?: string; code?: string };
      res.json({ banks: await QfsQuasarBridgeService.lookupBanks(tenantId(req), q, code) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // POST /sandbox/accounts/generate
  async generateAccount(req: Request, res: Response) {
    try {
      const { accountName, count = 1, bankCode, bankName, serviceSlug } = req.body;
      if (!accountName) return res.status(400).json({ error: 'accountName is required' });

      const result = await QfsQuasarBridgeService.generateAccounts(
        tenantId(req),
        accountName,
        Number(count),
        bankCode,
        bankName,
        serviceSlug,
      );

      res.status(201).json({
        accounts: result.accounts,
        backend: QfsQuasarBridgeService.isQuasarMode() ? 'quasar' : 'local',
        /** Exact body sent to Quasar POST /api/v1/sandbox/accounts/generate (null in local mode) */
        quasarPayload: result.quasarPayload,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/accounts
  async listAccounts(req: Request, res: Response) {
    try {
      res.json({
        accounts: await QfsQuasarBridgeService.listAccounts(tenantId(req)),
        backend: QfsQuasarBridgeService.isQuasarMode() ? 'quasar' : 'local',
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/accounts/:id
  async getAccount(req: Request, res: Response) {
    try {
      res.json(await QfsQuasarBridgeService.getAccount(tenantId(req), req.params.id));
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  },

  // POST /sandbox/accounts/:id/credit
  async creditAccount(req: Request, res: Response) {
    try {
      const { amount, reason, currency } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'amount (kobo) must be > 0' });
      if (!reason) return res.status(400).json({ error: 'reason is required' });
      const cid = correlationId(req);
      const result = await QfsQuasarBridgeService.credit(
        tenantId(req),
        req.params.id,
        Number(amount),
        reason,
        currency,
        cid,
      );
      res.setHeader('X-Correlation-Id', cid);
      res.json(result);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // POST /sandbox/accounts/:id/debit
  async debitAccount(req: Request, res: Response) {
    try {
      const { amount, reason, currency } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: 'amount (kobo) must be > 0' });
      if (!reason) return res.status(400).json({ error: 'reason is required' });
      const cid = correlationId(req);
      const result = await QfsQuasarBridgeService.debit(
        tenantId(req),
        req.params.id,
        Number(amount),
        reason,
        currency,
        cid,
      );
      res.setHeader('X-Correlation-Id', cid);
      res.json(result);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // GET /sandbox/accounts/:id/ledger
  async getLedger(req: Request, res: Response) {
    try {
      const { limit = '50', offset = '0' } = req.query as any;
      res.json({
        entries: await QfsQuasarBridgeService.getLedger(
          tenantId(req),
          req.params.id,
          Number(limit),
          Number(offset),
        ),
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  },

  // GET /sandbox/accounts/:id/balance-snapshots
  async getBalanceSnapshots(req: Request, res: Response) {
    try {
      res.json({
        snapshots: await QfsQuasarBridgeService.getBalanceSnapshots(tenantId(req), req.params.id),
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  },

  // GET /sandbox/audit-logs
  async getAuditLogs(req: Request, res: Response) {
    try {
      const { limit = '50', offset = '0' } = req.query as any;
      res.json({
        logs: await QfsQuasarBridgeService.getAuditLogs(
          tenantId(req),
          Number(limit),
          Number(offset),
        ),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/timeline
  async getTimeline(req: Request, res: Response) {
    try {
      const { limit = '50' } = req.query as any;
      res.json({ events: await QfsQuasarBridgeService.getTimeline(tenantId(req), Number(limit)) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/timeline/:correlationId
  async getTimelineByCorrelation(req: Request, res: Response) {
    try {
      res.json(
        await QfsQuasarBridgeService.getTimelineByCorrelation(
          tenantId(req),
          req.params.correlationId,
        ),
      );
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/profiles
  async getProfiles(_req: Request, res: Response) {
    res.json({ profiles: QfsQuasarBridgeService.getProfiles() });
  },

  // POST /sandbox/transfers
  async createTransfer(req: Request, res: Response) {
    try {
      if (!req.body.amountKobo && !req.body.amount) {
        return res.status(400).json({ error: 'amount or amountKobo is required' });
      }
      const cid = correlationId(req);
      req.body.correlationId = cid;
      const data = await QfsQuasarBridgeService.createTransfer(tenantId(req), req.body);
      res.setHeader('X-Correlation-Id', cid);
      res.status(201).json(data);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // POST /sandbox/transfers/generate
  async generateTransfer(req: Request, res: Response) {
    try {
      const { profileId } = req.body;
      if (!profileId) return res.status(400).json({ error: 'profileId is required' });
      res.status(201).json(await QfsQuasarBridgeService.generateTransfer(tenantId(req), profileId));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // GET /sandbox/transfers
  async listTransfers(req: Request, res: Response) {
    try {
      const { limit = '50', offset = '0' } = req.query as any;
      res.json({
        transfers: await QfsQuasarBridgeService.listTransfers(
          tenantId(req),
          Number(limit),
          Number(offset),
        ),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  },

  // GET /sandbox/transfers/:id
  async getTransfer(req: Request, res: Response) {
    try {
      res.json(await QfsQuasarBridgeService.getTransfer(tenantId(req), req.params.id));
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  },

  // POST /sandbox/transfers/:id/approve
  async approveTransfer(req: Request, res: Response) {
    try {
      res.json(await QfsQuasarBridgeService.transitionTransfer(tenantId(req), req.params.id, 'approve'));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // POST /sandbox/transfers/:id/reject
  async rejectTransfer(req: Request, res: Response) {
    try {
      res.json(await QfsQuasarBridgeService.transitionTransfer(tenantId(req), req.params.id, 'reject'));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // POST /sandbox/transfers/:id/reverse
  async reverseTransfer(req: Request, res: Response) {
    try {
      res.json(await QfsQuasarBridgeService.transitionTransfer(tenantId(req), req.params.id, 'reverse'));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },

  // GET /sandbox/providers
  async getProviders(_req: Request, res: Response) {
    const catalog = QfsQuasarBridgeService.getProvidersCatalog();
    const providers = Object.entries(catalog).map(([key, val]) => ({ id: key, ...val }));
    res.json({ providers });
  },

  // GET /sandbox/providers/:provider
  async getProvider(req: Request, res: Response) {
    const catalog = QfsQuasarBridgeService.getProvidersCatalog();
    const psp = catalog[req.params.provider.toUpperCase() as keyof typeof catalog];
    if (!psp) return res.status(404).json({ error: 'Provider not found' });
    res.json({ id: req.params.provider.toUpperCase(), ...psp });
  },

  // POST /sandbox/providers/:provider/simulate
  async simulateProvider(req: Request, res: Response) {
    try {
      res.json(
        await QfsQuasarBridgeService.simulateProvider(
          tenantId(req),
          req.params.provider,
          req.body,
        ),
      );
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  },
};
