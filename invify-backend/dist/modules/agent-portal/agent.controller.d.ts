import { Request, Response } from 'express';
export interface Agent {
    id: string;
    agentCode: string;
    passwordHash: string;
    isFirstLogin: boolean;
    name: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    address?: string;
    passportImage?: string;
    idCard?: string;
    kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
    status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';
    commissions: number;
    points: number;
    createdAt: Date;
    commissionSettings?: {
        onboardingFee?: number;
        revSharePercentage?: number;
    };
    suspensionReason?: string;
    requiredAction?: 'NONE' | 'UPLOAD_PASSPORT' | 'UPLOAD_ID' | 'ANSWER_QUESTION';
    actionQuestion?: string;
    actionAnswer?: string;
    territory?: string;
    region?: string;
    operational_area?: string;
}
export declare class AgentController {
    /**
     * Request password reset for an agent
     */
    static forgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Onboard a new agent (called by Super Admin)
     */
    static onboardAgent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Agent Login logic
     */
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Public Agent Registration
     */
    static register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * First-time password change
     */
    static changePassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get agent dashboard stats and onboarded tenants
     */
    /**
     * Get Field Agent Portal Operations Dashboard Data
     */
    /**
     * Get Field Agent Portal Operations Dashboard Data
     */
    static getDashboard(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static assignHardware(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static syncHardware(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateAgentStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateAgentKyc(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getAgentCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateAgentCommissions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static messageAgent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static messageAgentTenants(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static resolveSuspension(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
