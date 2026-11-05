import { Request, Response } from 'express';
export declare class TrainingController {
    getCourses(req: Request, res: Response): Promise<void>;
    enrollCourse(req: Request, res: Response): Promise<void>;
    updateProgress(req: Request, res: Response): Promise<void>;
}
