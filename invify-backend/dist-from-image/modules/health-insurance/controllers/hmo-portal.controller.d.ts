import { Request, Response } from 'express';
export declare class HmoPortalController {
    private static getCtx;
    static getOverview(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listSchools(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateSchoolOnboarding(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listPlans(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createOrVersionPlan(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updatePlanStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listEnrollments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static adjudicateEnrollment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listExportMappings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveExportMapping(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listBatches(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createBatch(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static exportBatchCsv(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static reconcileResponseSheet(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listFacilities(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static saveFacility(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listClaimsAndPreAuths(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static adjudicateClaimOrPreAuth(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static getBillingSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static listUsersAndAudit(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
