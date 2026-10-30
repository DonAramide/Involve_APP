"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportController = void 0;
const support_service_1 = require("../services/support.service");
const supportService = new support_service_1.SupportService();
class SupportController {
    async getTickets(req, res) {
        try {
            const tickets = await supportService.getTickets();
            res.json(tickets);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async createTicket(req, res) {
        try {
            const ticket = await supportService.createTicket(req.body);
            res.status(201).json(ticket);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getTicketById(req, res) {
        try {
            const ticket = await supportService.getTicketById(req.params.id);
            if (!ticket) {
                return res.status(404).json({ error: 'Ticket not found' });
            }
            res.json(ticket);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async addComment(req, res) {
        try {
            const comment = await supportService.addComment(req.params.id, req.body);
            res.status(201).json(comment);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.SupportController = SupportController;
//# sourceMappingURL=support.controller.js.map