export type WAFRuleId = 'SQL_INJECTION' | 'XSS' | 'PATH_TRAVERSAL' | 'COMMAND_INJECTION' | 'OPEN_REDIRECT';
export type WAFSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WAFAction = 'LOG' | 'BLOCK';
export interface WAFRule {
    id: WAFRuleId;
    description: string;
    pattern: RegExp;
    severity: WAFSeverity;
    action: WAFAction;
}
export interface WAFViolation {
    ruleId: WAFRuleId;
    severity: WAFSeverity;
    action: WAFAction;
    matchedOn: string;
    matchedValue: string;
}
export interface WAFDecision {
    allowed: boolean;
    violations: WAFViolation[];
    /** 0 = clean, 100 = maximum risk */
    riskScore: number;
}
export interface WAFRequest {
    path?: string;
    query?: Record<string, string>;
    body?: Record<string, any>;
    headers?: Record<string, string>;
}
export declare class WAFRulesEngine {
    private static customRules;
    static clearCustomRules(): void;
    /** Register an additional custom rule on top of built-ins. */
    static addRule(rule: WAFRule): void;
    static getRules(): WAFRule[];
    /**
     * Inspects every string value in the request against all WAF rules.
     */
    static inspect(request: WAFRequest): WAFDecision;
}
