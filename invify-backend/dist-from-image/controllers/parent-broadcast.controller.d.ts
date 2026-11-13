import { Request, Response } from 'express';
export declare function collectParentRecipients(rows: any[]): {
    parents: number;
    emails: string[];
    phones: string[];
};
export declare class ParentBroadcastController {
    static audience(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static send(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
