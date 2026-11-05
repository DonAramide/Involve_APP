import { Request, Response } from 'express';
export declare class AttendanceController {
    /**
     * Helper to extract tenantId from request context safely.
     */
    private static getTenant;
    /**
     * GET /attendance/students
     */
    static listStudents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /attendance/enroll
     */
    static enroll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/settings
     */
    static getSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PUT /attendance/settings
     */
    static updateSettings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/calendar
     */
    static listCalendarExceptions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /attendance/calendar
     */
    static addCalendarException(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * DELETE /attendance/calendar/:id
     */
    static deleteCalendarException(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/assignments
     */
    static listAssignments(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /attendance/assignments
     */
    static createAssignment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * DELETE /attendance/assignments/:id
     */
    static deleteAssignment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/register
     * Fetch digital register for a class on a specific date.
     */
    static getRegister(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /attendance/save
     * Save draft or finalize register.
     */
    static saveRegister(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /attendance/bulk-present
     * Bulk mark present with explicit confirmation.
     */
    static bulkPresent(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /attendance/correct
     * Audited correction of a finalized attendance record.
     */
    static correctEntry(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/report
     * Class attendance report data (matching reference image 1).
     */
    static getClassReport(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/report/pdf
     * Download print-ready Class Attendance Report PDF.
     */
    static exportClassReportPdf(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/register/pdf
     * Download print-ready Weekly Class Attendance Register PDF (matching reference image 2).
     */
    static exportRegisterPdf(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/student-history/:studentId
     */
    static getStudentHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/history
     */
    static getHistory(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * GET /attendance/audit-log
     */
    static getAuditLog(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
