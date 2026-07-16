import { Request, Response } from 'express';
export declare class SupportController {
    getTickets(req: Request, res: Response): Promise<void>;
    createTicket(req: Request, res: Response): Promise<void>;
    getTicketById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    addComment(req: Request, res: Response): Promise<void>;
}
