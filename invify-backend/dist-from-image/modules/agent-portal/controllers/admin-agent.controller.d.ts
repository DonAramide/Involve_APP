import { Request, Response } from 'express';
export declare class AdminAgentController {
    /**
     * Onboard a new Agent
     * POST /admin/agents/onboard
     */
    static onboardAgent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Re-send the welcome / set-password email
     * POST /admin/agents/:id/resend-invite
     */
    static resendInvite(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
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
     * Update Agent / Institute Profile Details
     * PATCH /admin/agents/:id
     */
    static updateAgentProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update Agent Status
     * PATCH /admin/agents/:id/status
     */
    static updateAgentStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update Agent KYC Status
     * PATCH /admin/agents/:id/kyc
     */
    static updateKycStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get Agent Commissions
     * GET /admin/agents/:id/commissions
     */
    static getCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update Agent Commissions
     * PATCH /admin/agents/:id/commissions
     */
    static updateCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Send Direct Message to Agent
     * POST /admin/agents/:id/message
     */
    static messageAgent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Broadcast message to all tenants managed by agent
     * POST /admin/agents/:id/message-tenants
     */
    static messageTenants(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Upload / update official institution logo
     * POST /admin/agents/:id/logo
     */
    static updateLogo(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Remove official institution logo
     * DELETE /admin/agents/:id/logo
     */
    static deleteLogo(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Global Audit Logs
     * GET /admin/agents/audit-logs
     */
    static getAuditLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
