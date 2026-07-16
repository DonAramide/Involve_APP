import { Request, Response } from 'express';
export declare class MfaController {
    static generate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static enable(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
