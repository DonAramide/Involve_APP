import { Request, Response } from 'express';
import { supabaseAdmin } from '../../../db/supabase';
import {
  adminListDeliveries,
  adminListWebhooks,
  adminSetWebhookStatus,
  enqueueTestEvent,
  getDeveloperSnapshot,
  listDeliveries,
  resolveAgentFromAuth,
  rotateApiCredential,
  rotateWebhookSigning,
  saveWebhook,
  setWebhookStatus,
  verifyAgentApiRequest,
} from '../services/agent-webhook.service';
import { loadAgentFeeReadModel, loadAttributedTenantIds, isAgentPayoutExecutionEnabled } from '../services/agent-fee-read-model';

function actor(req: Request) {
  return (req as any).user?.email || '';
}

export class AgentWebhookController {
  static async sessionCommission(req: Request, res: Response) {
    try {
      const verified = await resolveAgentFromAuth((req as any).user?.id);
      const attributed = await loadAttributedTenantIds(verified.id, verified.agent_code);
      const data = await loadAgentFeeReadModel(verified.agent_code, attributed.tenantIds, verified.id);
      res.json({ success: true, data, agent_id: verified.id });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async snapshot(req: Request, res: Response) {
    try {
      const data = await getDeveloperSnapshot((req as any).user?.id);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async saveWebhook(req: Request, res: Response) {
    try {
      const data = await saveWebhook((req as any).user?.id, req.body?.webhook_url || req.body?.url, actor(req));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 400).json({ success: false, code: err.code, message: err.message });
    }
  }

  static async enable(req: Request, res: Response) {
    try {
      const data = await setWebhookStatus((req as any).user?.id, 'ENABLED', actor(req));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async disable(req: Request, res: Response) {
    try {
      const data = await setWebhookStatus((req as any).user?.id, 'DISABLED', actor(req));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async test(req: Request, res: Response) {
    try {
      const data = await enqueueTestEvent((req as any).user?.id, actor(req));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async rotateWebhook(req: Request, res: Response) {
    try {
      const data = await rotateWebhookSigning((req as any).user?.id, actor(req), Boolean(req.body?.confirm));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 400).json({ success: false, code: err.code, message: err.message });
    }
  }

  static async rotateApi(req: Request, res: Response) {
    try {
      const data = await rotateApiCredential((req as any).user?.id, actor(req), Boolean(req.body?.confirm));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 400).json({ success: false, code: err.code, message: err.message });
    }
  }

  static async deliveries(req: Request, res: Response) {
    try {
      const data = await listDeliveries((req as any).user?.id);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async adminList(req: Request, res: Response) {
    try {
      const data = await adminListWebhooks();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async adminDeliveries(req: Request, res: Response) {
    try {
      const data = await adminListDeliveries(req.params.agentId);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async adminEnable(req: Request, res: Response) {
    try {
      const data = await adminSetWebhookStatus(req.params.agentId, 'ENABLED', actor(req));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async adminDisable(req: Request, res: Response) {
    try {
      const data = await adminSetWebhookStatus(req.params.agentId, 'DISABLED', actor(req));
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  static async v1Commission(req: Request, res: Response) {
    try {
      const keyId = String(req.header('X-Invify-Key-ID') || '');
      const timestamp = String(req.header('X-Invify-Timestamp') || '');
      const signature = String(req.header('X-Invify-Signature') || '');
      const verified = await verifyAgentApiRequest(keyId, timestamp, { path: '/api/agent/v1/commission', method: 'GET' }, signature);
      const { data: agent } = await supabaseAdmin.from('agents').select('id, agent_code').eq('id', verified.agent_id).maybeSingle();
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
      const attributed = await loadAttributedTenantIds(agent.id, agent.agent_code);
      const data = await loadAgentFeeReadModel(agent.agent_code, attributed.tenantIds, agent.id);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 401).json({ success: false, code: err.code, message: err.message });
    }
  }

  static async v1Withdrawals(req: Request, res: Response) {
    try {
      const keyId = String(req.header('X-Invify-Key-ID') || '');
      const timestamp = String(req.header('X-Invify-Timestamp') || '');
      const signature = String(req.header('X-Invify-Signature') || '');
      await verifyAgentApiRequest(keyId, timestamp, { path: req.path, method: req.method }, signature);
      if (req.method === 'POST') {
        if (!isAgentPayoutExecutionEnabled()) {
          return res.status(409).json({
            success: false,
            code: 'PAYOUT_DISABLED',
            message: 'PAYOUT_DISABLED: real-money payouts are not enabled.',
          });
        }
        return res.status(409).json({ success: false, code: 'PAYOUT_DISABLED', message: 'PAYOUT_DISABLED' });
      }
      res.json({ success: true, data: [] });
    } catch (err: any) {
      res.status(err.status || 401).json({ success: false, code: err.code, message: err.message });
    }
  }
}
