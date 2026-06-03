import { Request, Response } from 'express';
import { agentService } from '../services/agent.service';

export class AdminAgentController {
  
  /**
   * Onboard a new Agent
   * POST /admin/agents/onboard
   */
  static async onboardAgent(req: Request, res: Response) {
    try {
      // Typically from req.user (JWT context)
      const creatorId = (req as any).user?.id || '00000000-0000-0000-0000-000000000000';
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const newAgent = await agentService.onboardAgent(
        creatorId, 
        req.body,
        ipAddress,
        userAgent
      );

      return res.status(201).json({
        success: true,
        message: 'Agent successfully onboarded and invitation dispatched',
        data: newAgent
      });
    } catch (err: any) {
      console.error('[AdminAgentController] Error onboarding agent:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * List Agents
   * GET /admin/agents
   */
  static async listAgents(req: Request, res: Response) {
    try {
      const { status, territory_id } = req.query;
      const agents = await agentService.listAgents({
        status: status as string,
        territory_id: territory_id as string
      });

      return res.status(200).json({ success: true, data: agents });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get specific Agent by ID
   * GET /admin/agents/:id
   */
  static async getAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const agent = await agentService.getAgent(id);
      
      if (!agent) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }

      return res.status(200).json({ success: true, data: agent });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Update Agent Status
   * PATCH /admin/agents/:id/status
   */
  static async updateAgentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const actorId = (req as any).user?.id || '00000000-0000-0000-0000-000000000000';
      
      if (!status || !reason) {
        return res.status(400).json({ success: false, message: 'Status and reason are required' });
      }

      const updatedAgent = await agentService.updateStatus(
        id, 
        status, 
        reason, 
        actorId,
        req.ip,
        req.headers['user-agent']
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Agent status successfully updated',
        data: updatedAgent 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Global Audit Logs
   * GET /admin/agents/audit-logs
   */
  static async getAuditLogs(req: Request, res: Response) {
    // Requires a fetch from agentRepository
    // ... Placeholder for implementation
    return res.status(200).json({ success: true, data: [] });
  }
}
