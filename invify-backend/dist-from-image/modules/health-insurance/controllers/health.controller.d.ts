import { Request, Response } from 'express';
export declare class HealthController {
    static getOverview(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listProviders(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listPlans(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listTenantOffers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static configureTenantOffer(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listFacilities(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listMembers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static enrolStudent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static enrolStaff(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static inviteGuardian(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static acceptGuardianInvitation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static verifyGuardianRelationship(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listGuardianChildren(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listEnrolments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createEnrolment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static verifyEnrolment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static simulateSandboxActivation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static issueInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static initiatePayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static confirmPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listClaims(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static lookupClaim(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static handleProviderWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
