// invify-backend/src/modules/financial-platform/activation/FinancialPlatformActivationController.ts

import { Request, Response } from 'express';
import { FinancialPlatformActivationService } from './FinancialPlatformActivationService';
import { ObservabilityContext } from '../domain/Types';
import { v4 as uuidv4 } from 'uuid';
import { GovAuditService } from '../../../services/gov-audit.service';
import {
  assertCheckerCanActivate,
  evidenceForChecks,
  loadActivationGate,
  ManualCheckKey,
  markProposalApproved,
  proposeActivation,
  recordManualCheck,
  rejectActivationProposal,
} from './activation-gate';

function actor(req: Request) {
  const user = (req as any).user || {};
  return {
    id: String(user.id || user.sub || ''),
    email: String(user.email || ''),
  };
}

function clientIp(req: Request) {
  return String(req.ip || req.socket?.remoteAddress || '0.0.0.0');
}

export class FinancialPlatformActivationController {
  constructor(
    private activationService: FinancialPlatformActivationService
  ) {}

  async getGate(req: Request, res: Response) {
    try {
      const tenantId = req.params.id;
      const { gate } = await loadActivationGate(tenantId);
      const evidence = await evidenceForChecks(tenantId);
      return res.status(200).json({ gate, evidence });
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message || 'Failed to load activation gate' });
    }
  }

  async recordCheck(req: Request, res: Response) {
    try {
      const user = actor(req);
      const key = String(req.body?.key || '') as ManualCheckKey;
      const passed = req.body?.passed !== false;
      const gate = await recordManualCheck({
        tenantId: req.params.id,
        key,
        passed,
        actorId: user.id,
        actorEmail: user.email,
        notes: req.body?.notes,
      });
      await GovAuditService.logAction({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        module: 'MAKER_CHECKER',
        action: `FP_MANUAL_CHECK_${String(key).toUpperCase()}`,
        user_email: user.email,
        user_name: user.email,
        ip_address: clientIp(req),
        tenant_id: req.params.id,
        target: req.params.id,
        status: passed ? 'approved' : 'rejected',
        metadata: { notes: req.body?.notes },
      });
      return res.status(200).json({ success: true, gate });
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message || 'Failed to record check' });
    }
  }

  async propose(req: Request, res: Response) {
    try {
      const user = actor(req);
      const gate = await proposeActivation({
        tenantId: req.params.id,
        actorId: user.id,
        actorEmail: user.email,
      });
      await GovAuditService.logAction({
        id: gate.proposal?.id || uuidv4(),
        timestamp: new Date().toISOString(),
        module: 'MAKER_CHECKER',
        action: 'FP_ACTIVATION_PROPOSE',
        user_email: user.email,
        user_name: user.email,
        ip_address: clientIp(req),
        tenant_id: req.params.id,
        target: req.params.id,
        status: 'pending',
      });
      return res.status(200).json({ success: true, gate });
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message || 'Propose failed' });
    }
  }

  async reject(req: Request, res: Response) {
    try {
      const user = actor(req);
      const gate = await rejectActivationProposal({
        tenantId: req.params.id,
        actorId: user.id,
        actorEmail: user.email,
        reason: req.body?.reason,
      });
      await GovAuditService.logAction({
        id: gate.proposal?.id || uuidv4(),
        timestamp: new Date().toISOString(),
        module: 'MAKER_CHECKER',
        action: 'FP_ACTIVATION_REJECT',
        user_email: user.email,
        user_name: user.email,
        ip_address: clientIp(req),
        tenant_id: req.params.id,
        target: req.params.id,
        status: 'rejected',
      });
      return res.status(200).json({ success: true, gate });
    } catch (error: any) {
      return res.status(error.status || 500).json({ error: error.message || 'Reject failed' });
    }
  }

  /**
   * POST /api/v1/tenants/:id/financial-platform/activate
   * Checker-only after CAC / phone-call / address manual checks.
   */
  async activate(req: Request, res: Response) {
    try {
      const tenantId = req.params.id;
      const user = actor(req);

      await assertCheckerCanActivate({
        tenantId,
        actorId: user.id,
        actorEmail: user.email,
      });

      const context: ObservabilityContext = {
        correlationId: req.headers['x-correlation-id'] as string || uuidv4(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        traceId: req.headers['x-trace-id'] as string || uuidv4(),
        auditId: uuidv4(),
        actorId: user.id || 'system',
        tenantId: tenantId
      };

      const result = await this.activationService.activateTenant(tenantId, context);
      await markProposalApproved({
        tenantId,
        actorId: user.id,
        actorEmail: user.email,
      });
      await GovAuditService.logAction({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        module: 'MAKER_CHECKER',
        action: 'FP_ACTIVATION_APPROVE',
        user_email: user.email,
        user_name: user.email,
        ip_address: clientIp(req),
        tenant_id: tenantId,
        target: tenantId,
        status: 'approved',
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Activation Error:', error);
      
      if (error.status === 400 || error.status === 403) {
        return res.status(error.status).json({ error: error.message });
      }
      if (error.message.includes('already in progress') || error.message.includes('already activated')) {
        return res.status(409).json({ error: error.message });
      }

      const details =
        error?.response?.data?.responseMessage ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to activate financial platform';
      return res.status(500).json({ error: 'Failed to activate financial platform', details });
    }
  }
}
