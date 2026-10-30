import { Request, Response } from 'express';
export declare class SecurityController {
    static changePassword(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static enableMfa(req: Request, res: Response): Promise<void>;
    static verifyMfa(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static confirmLoginMfa(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static disableMfa(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getSessions(req: Request, res: Response): Promise<void>;
    static revokeSession(req: Request, res: Response): Promise<void>;
}
