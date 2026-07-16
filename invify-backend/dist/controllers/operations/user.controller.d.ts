import { Request, Response } from 'express';
export declare class UserController {
    static listUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static createUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
