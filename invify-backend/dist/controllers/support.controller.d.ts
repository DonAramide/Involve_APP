import { Request, Response } from 'express';
export declare class SupportController {
    /**
     * POST /api/mobile/complaints
     * Submit a new complaint from mobile app
     */
    static createComplaint(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/admin/complaints
     * List all complaints for Web Admin
     */
    static listComplaints(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /api/mobile/complaints
     * Get complaints for the specific tenant/device
     */
    static getMobileComplaints(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /api/admin/complaints/:id/status
     */
    static updateComplaintStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
