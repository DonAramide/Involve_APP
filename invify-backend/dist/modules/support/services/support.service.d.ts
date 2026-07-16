export declare class SupportService {
    getTickets(): Promise<any[]>;
    createTicket(ticketData: any): Promise<any>;
    getTicketById(id: string): Promise<any>;
    addComment(ticketId: string, commentData: any): Promise<any>;
}
