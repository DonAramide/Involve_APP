import { Request, Response } from 'express';
export declare class TerritoryController {
    static create(req: Request, res: Response): Promise<void>;
    static list(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
}
