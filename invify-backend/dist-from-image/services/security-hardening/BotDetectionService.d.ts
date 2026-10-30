export type BotClassification = 'HUMAN' | 'SUSPECTED_BOT' | 'CONFIRMED_BOT' | 'KNOWN_CRAWLER';
export type BotAction = 'ALLOW' | 'FLAG' | 'BLOCK';
export interface BotAnalysisRequest {
    userAgent: string;
    ip?: string;
    headers?: Record<string, string>;
}
export interface BotAnalysisResult {
    /** 0 = definitely human, 100 = definitely bot */
    score: number;
    classification: BotClassification;
    action: BotAction;
    signals: string[];
}
export declare class BotDetectionService {
    static clearState(): void;
    /**
     * Analyses a request for bot signals.
     * Scoring is additive from UA pattern matches plus header heuristics.
     */
    static analyzeRequest(req: BotAnalysisRequest): BotAnalysisResult;
}
