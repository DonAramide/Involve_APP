import { Request, Response } from 'express';
import { SupportService } from '../services/support.service';

const supportService = new SupportService();

export class SupportController {
  async getTickets(req: Request, res: Response) {
    try {
      const tickets = await supportService.getTickets();
      res.json(tickets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createTicket(req: Request, res: Response) {
    try {
      const ticket = await supportService.createTicket(req.body);
      res.status(201).json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTicketById(req: Request, res: Response) {
    try {
      const ticket = await supportService.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      res.json(ticket);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addComment(req: Request, res: Response) {
    try {
      const comment = await supportService.addComment(req.params.id, req.body);
      res.status(201).json(comment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
