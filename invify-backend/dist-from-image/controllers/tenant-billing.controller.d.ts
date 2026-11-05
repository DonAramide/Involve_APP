import { Request, Response } from 'express';
import { TenantBillingService } from '../modules/tenant-billing/tenant-billing.service';
export declare class TenantBillingController {
    static service(): TenantBillingService;
    static ready(): Promise<TenantBillingService>;
    static overview(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static accounts(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static ensureAccount(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static obligations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createObligation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createPlan(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createSubscription(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static previewPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static postPayment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static reversePayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static tenantProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static reports(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static overdue(_req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static payments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static installments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
