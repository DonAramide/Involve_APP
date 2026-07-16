export declare class ProfileRepository {
    getByAgentId(agentId: string): Promise<any>;
    update(agentId: string, updates: any): Promise<any>;
}
export declare const profileRepository: ProfileRepository;
