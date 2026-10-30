export declare class ReputationService {
    processEvent(eventType: string, referenceId: string | null, agentId: string): Promise<void>;
}
export declare const reputationService: ReputationService;
