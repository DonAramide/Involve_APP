export declare class LeadService {
    createLead(data: any, actorId: string, ip: string, ua: string): Promise<any>;
    getLeadsByAgent(agentId: string): Promise<any[]>;
    getAllLeads(): Promise<any[]>;
}
export declare const leadService: LeadService;
