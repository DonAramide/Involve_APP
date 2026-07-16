export declare class ApprovalWorkflowService {
    /**
     * Approves a pending commission ticket and transitions it to PAID,
     * securely updating the agent_commission_wallets table.
     */
    static approveCommission(ticketId: string, operatorId: string): Promise<boolean>;
    /**
     * Rejects a pending ticket.
     */
    static rejectCommission(ticketId: string, reason: string, operatorId: string): Promise<boolean>;
    /**
     * Manual Clawback: Reverses an already PAID commission.
     */
    static executeClawback(agentId: string, amount: number, reason: string, justification: string, operatorId: string): Promise<boolean>;
    /**
     * Escalates a pending ticket to the SUPER_ADMIN global queue.
     */
    static escalateTicket(ticketId: string, operatorId: string): Promise<boolean>;
}
