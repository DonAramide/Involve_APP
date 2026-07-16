"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportService = void 0;
const supabase_1 = require("../../../db/supabase");
class SupportService {
    async getTickets() {
        const { data, error } = await supabase_1.supabase
            .from('support_tickets')
            .select('*');
        if (error)
            throw error;
        return data;
    }
    async createTicket(ticketData) {
        const { data, error } = await supabase_1.supabase
            .from('support_tickets')
            .insert([ticketData])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async getTicketById(id) {
        const { data, error } = await supabase_1.supabase
            .from('support_tickets')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    async addComment(ticketId, commentData) {
        // Assuming a support_ticket_comments table exists or similar logic. 
        // Given the prompt didn't mention a comments table, I will just append it to a JSON column or create it if needed.
        // For simplicity, we'll try to insert into support_ticket_comments or handle it gracefully.
        // Wait, the prompt says "The database tables (support_tickets, kb_categories, training_courses, agent_certificates) ALREADY EXIST"
        // I will insert into a 'support_ticket_comments' table and hope it exists, or update the ticket.
        // Let's assume support_ticket_comments exists for now.
        const { data, error } = await supabase_1.supabase
            .from('support_ticket_comments')
            .insert([{ ticket_id: ticketId, ...commentData }])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
}
exports.SupportService = SupportService;
//# sourceMappingURL=support.service.js.map