import { Request, Response } from 'express';
export declare class AttendanceController {
    static listStudents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static enroll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static autoSave(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static bulkPresent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/history
     */
    static getHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
