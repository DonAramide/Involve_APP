"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDbRrn = normalizeDbRrn;
exports.normalizeDbStan = normalizeDbStan;
exports.normalizeDbTerminal = normalizeDbTerminal;
exports.amountsClose = amountsClose;
exports.amountCandidates = amountCandidates;
exports.scoreSettlementMatch = scoreSettlementMatch;
exports.buildSettlementMatchReason = buildSettlementMatchReason;
function normalizeDbRrn(value) {
    if (!value || value === 'N/A')
        return null;
    const id = String(value).trim().replace(/\s+/g, '');
    if (/^\d+$/.test(id))
        return id.padStart(12, '0').slice(-12);
    return id.toUpperCase();
}
function normalizeDbStan(value) {
    if (!value || value === 'N/A')
        return null;
    const id = String(value).trim().replace(/\s+/g, '');
    if (/^\d+$/.test(id))
        return id.padStart(6, '0').slice(-6);
    return id;
}
function normalizeDbTerminal(value) {
    if (!value)
        return null;
    return String(value).trim().toUpperCase();
}
function amountsClose(a, b, tolerance = 0.02) {
    return Math.abs(a - b) <= tolerance;
}
function amountCandidates(amount) {
    const values = [amount];
    if (amount >= 100)
        values.push(amount / 100);
    if (amount <= 100000)
        values.push(amount * 100);
    return [...new Set(values.map((v) => Math.round(v * 100) / 100))];
}
function scoreSettlementMatch(row, attempt) {
    let score = 0;
    const attemptRrn = normalizeDbRrn(attempt.rrn);
    const attemptStan = normalizeDbStan(attempt.stan);
    const attemptTerminal = normalizeDbTerminal(attempt.terminal_id);
    if (row.rrn && attemptRrn && row.rrn === attemptRrn)
        score += 40;
    if (row.stan && attemptStan && row.stan === attemptStan)
        score += 25;
    if (row.terminalId && attemptTerminal && row.terminalId === attemptTerminal)
        score += 20;
    const attemptAmount = Number(attempt.amount || 0);
    if (row.amount > 0 && attemptAmount > 0) {
        for (const candidate of amountCandidates(row.amount)) {
            if (amountsClose(candidate, attemptAmount)) {
                score += 15;
                break;
            }
        }
    }
    if (row.authCode && attempt.auth_code && row.authCode === String(attempt.auth_code).trim()) {
        score += 10;
    }
    if (row.rrn && attemptRrn && row.rrn !== attemptRrn)
        return 0;
    if (row.stan && attemptStan && row.stan !== attemptStan)
        score -= 10;
    return score;
}
function buildSettlementMatchReason(row, attempt) {
    const parts = [];
    const attemptRrn = normalizeDbRrn(attempt.rrn);
    const attemptStan = normalizeDbStan(attempt.stan);
    const attemptTerminal = normalizeDbTerminal(attempt.terminal_id);
    if (row.rrn && attemptRrn && row.rrn === attemptRrn)
        parts.push('RRN');
    if (row.stan && attemptStan && row.stan === attemptStan)
        parts.push('STAN');
    if (row.terminalId && attemptTerminal && row.terminalId === attemptTerminal)
        parts.push('Terminal');
    if (row.amount > 0 && amountsClose(row.amount, Number(attempt.amount || 0)))
        parts.push('Amount');
    return parts.length ? `Matched on ${parts.join(' + ')}` : 'Weak match';
}
//# sourceMappingURL=settlement-matcher.js.map