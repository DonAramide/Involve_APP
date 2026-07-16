export declare class LeadRepository {
    create(data: any): Promise<any>;
    findByAgent(agentId: string): Promise<any[]>;
    findAll(): Promise<any[]>;
}
export declare const leadRepository: LeadRepository;
