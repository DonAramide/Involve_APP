import { Request, Response } from 'express';
export declare class AIController {
    /**
     * POST /ai/lesson-note/generate
     */
    static generateLessonNote(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * POST /ai/lesson-note/refresh
     */
    static refreshLessonNote(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
