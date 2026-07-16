"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WAFRulesEngine = void 0;
const StructuredLogger_1 = require("../observability/StructuredLogger");
/** Built-in WAF rule set */
const BUILT_IN_RULES = [
    {
        id: 'SQL_INJECTION',
        description: 'Detects SQL injection patterns',
        // Common SQLi: UNION SELECT, OR 1=1, DROP TABLE, --comment, ; stacked queries
        pattern: /(\b(union|select|insert|update|delete|drop|truncate|exec|execute)\b.*(from|into|table|where|set))|('?\s*(or|and)\s*'?\d+'?\s*=\s*'?\d+'?)|(--|;\s*(drop|select|insert))/i,
        severity: 'CRITICAL',
        action: 'BLOCK',
    },
    {
        id: 'XSS',
        description: 'Detects Cross-Site Scripting patterns',
        pattern: /(<\s*script[\s>]|javascript\s*:|on\w+\s*=|<\s*iframe|<\s*img[^>]+onerror|document\.(cookie|write|location)|eval\s*\(|alert\s*\()/i,
        severity: 'HIGH',
        action: 'BLOCK',
    },
    {
        id: 'PATH_TRAVERSAL',
        description: 'Detects path traversal / directory traversal attempts',
        pattern: /(\.\.[\/\\]){2,}|(etc\/passwd|etc\/shadow|windows\/system32|\.\.%2f)/i,
        severity: 'HIGH',
        action: 'BLOCK',
    },
    {
        id: 'COMMAND_INJECTION',
        description: 'Detects OS command injection patterns',
        pattern: /(\|\s*(ls|cat|rm|wget|curl|bash|sh|cmd|powershell)\b)|(`[^`]*`)|(;\s*(ls|cat|rm|wget|curl|bash|sh)\b)/i,
        severity: 'CRITICAL',
        action: 'BLOCK',
    },
    {
        id: 'OPEN_REDIRECT',
        description: 'Detects open redirect attempts',
        pattern: /(redirect|url|next|return_to|destination)\s*=\s*(https?:\/\/(?![\w.-]*\binvolve\b))/i,
        severity: 'MEDIUM',
        action: 'LOG',
    },
];
/** Severity → risk score weight */
const SEVERITY_SCORE = {
    LOW: 10,
    MEDIUM: 25,
    HIGH: 50,
    CRITICAL: 80,
};
class WAFRulesEngine {
    static customRules = [];
    static clearCustomRules() {
        this.customRules = [];
    }
    /** Register an additional custom rule on top of built-ins. */
    static addRule(rule) {
        this.customRules.push(rule);
    }
    static getRules() {
        return [...BUILT_IN_RULES, ...this.customRules];
    }
    /**
     * Inspects every string value in the request against all WAF rules.
     */
    static inspect(request) {
        const rules = this.getRules();
        const violations = [];
        // Flatten request into { fieldLabel → value } pairs
        const candidates = [];
        if (request.path) {
            candidates.push({ field: 'path', value: request.path });
        }
        for (const [k, v] of Object.entries(request.query ?? {})) {
            candidates.push({ field: `query.${k}`, value: String(v) });
        }
        for (const [k, v] of Object.entries(request.body ?? {})) {
            candidates.push({ field: `body.${k}`, value: String(v) });
        }
        for (const [k, v] of Object.entries(request.headers ?? {})) {
            candidates.push({ field: `header.${k}`, value: String(v) });
        }
        for (const rule of rules) {
            for (const candidate of candidates) {
                if (rule.pattern.test(candidate.value)) {
                    violations.push({
                        ruleId: rule.id,
                        severity: rule.severity,
                        action: rule.action,
                        matchedOn: candidate.field,
                        matchedValue: candidate.value.substring(0, 120), // truncate for audit
                    });
                }
            }
        }
        // Calculate risk score: sum of distinct rule scores (each rule counts once)
        const hitRuleIds = new Set(violations.map((v) => v.ruleId));
        let riskScore = 0;
        for (const ruleId of hitRuleIds) {
            const rule = rules.find((r) => r.id === ruleId);
            riskScore += SEVERITY_SCORE[rule.severity];
        }
        riskScore = Math.min(100, riskScore);
        // BLOCK if any violation has action=BLOCK
        const blocked = violations.some((v) => v.action === 'BLOCK');
        const allowed = !blocked;
        if (!allowed) {
            StructuredLogger_1.StructuredLogger.warn('[WAF] Request BLOCKED', {
                violations: violations.map((v) => v.ruleId),
                riskScore,
            });
        }
        else if (violations.length > 0) {
            StructuredLogger_1.StructuredLogger.warn('[WAF] Request LOGGED (suspicious)', {
                violations: violations.map((v) => v.ruleId),
                riskScore,
            });
        }
        return { allowed, violations, riskScore };
    }
}
exports.WAFRulesEngine = WAFRulesEngine;
//# sourceMappingURL=WAFRulesEngine.js.map