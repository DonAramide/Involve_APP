import { Request, Response } from 'express';
export declare class WithdrawalController {
    static request(req: Request, res: Response): Promise<void>;
    static patchStatus(req: Request, res: Response): Promise<void>;
}
