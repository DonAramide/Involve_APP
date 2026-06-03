import { Request, Response } from 'express';
import { supportService } from '../services/support.service';

export class SupportController {
  static async list(req: Request, res: Response) {
    try {
      const tickets = await supportService.getTickets();
      res.status(200).json({ success: true, data: tickets });
    } catch (err: any) { res.status(500).json({ success: false, message: err.message }); }
  }
}