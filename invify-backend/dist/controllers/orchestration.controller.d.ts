import { Request, Response } from 'express';
export declare class OrchestrationController {
    static getContext(req: Request, res: Response): Promise<void>;
    static provisionOnboarding(req: Request, res: Response): Promise<void>;
    static enableModule(req: Request, res: Response): Promise<void>;
    static elevateTier(req: Request, res: Response): Promise<void>;
}
