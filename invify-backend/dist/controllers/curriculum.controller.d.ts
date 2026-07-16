import { Request, Response } from 'express';
export declare class CurriculumController {
    /**
     * GET /admin/curriculum
     * Lists standardized curriculum topics with filtering.
     */
    static listCurriculum(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /admin/curriculum
     * Restricted to Super Admin.
     */
    static createTopic(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * PATCH /admin/curriculum/:id
     */
    static updateTopic(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * DELETE /admin/curriculum/:id
     */
    static deleteTopic(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
