import { Request, Response } from 'express';
export declare class AdminAgentController {
    /**
     * Onboard a new Agent
     * POST /admin/agents/onboard
     */
    static onboardAgent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * List Agents
     * GET /admin/agents
     */
    static listAgents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get specific Agent by ID
     * GET /admin/agents/:id
     */
    static getAgent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update Agent Status
     * PATCH /admin/agents/:id/status
     */
    static updateAgentStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Global Audit Logs
     * GET /admin/agents/audit-logs
     */
    static getAuditLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
