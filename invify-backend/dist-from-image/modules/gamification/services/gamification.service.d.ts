export declare class GamificationService {
    getProfile(agentId: string): Promise<any>;
    getBadges(agentId: string): Promise<any[]>;
    getLeaderboard(limit?: number): Promise<any[]>;
    static injectReputation(agentId: string, points: number, reason: string): Promise<void>;
    static evaluateBadges(agentId: string): Promise<void>;
}
