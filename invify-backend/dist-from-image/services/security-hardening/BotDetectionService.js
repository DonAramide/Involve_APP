"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotDetectionService = void 0;
const StructuredLogger_1 = require("../observability/StructuredLogger");
/** Known malicious/scraper bot UA signatures → base score */
const KNOWN_BOT_PATTERNS = [
    { pattern: /python-requests|aiohttp|httpx|requests\//i, score: 75, label: 'PythonHTTPClient' },
    { pattern: /curl\/|wget\//i, score: 80, label: 'CurlWget' },
    { pattern: /scrapy|BeautifulSoup|mechanize/i, score: 90, label: 'WebScraper' },
    { pattern: /nmap|masscan|zmap|nuclei|sqlmap|nikto/i, score: 100, label: 'SecurityScanner' },
    { pattern: /phantomjs|headless|slimerjs/i, score: 85, label: 'HeadlessBrowser' },
    { pattern: /bot|crawler|spider|crawl|slurp|bingpreview/i, score: 60, label: 'GenericBot' },
    { pattern: /^$/, score: 70, label: 'EmptyUserAgent' },
];
/** Known legitimate crawlers — score ceiling 30 */
const KNOWN_CRAWLER_PATTERNS = [
    { pattern: /Googlebot|Bingbot|DuckDuckBot|Baiduspider|YandexBot/i },
];
const BLOCK_THRESHOLD = 70;
const FLAG_THRESHOLD = 40;
class BotDetectionService {
    static clearState() {
        // Stateless — nothing to clear
    }
    /**
     * Analyses a request for bot signals.
     * Scoring is additive from UA pattern matches plus header heuristics.
     */
    static analyzeRequest(req) {
        const signals = [];
        let score = 0;
        const ua = req.userAgent ?? '';
        // Check known legitimate crawlers first (caps score at 30)
        const isKnownCrawler = KNOWN_CRAWLER_PATTERNS.some((c) => c.pattern.test(ua));
        if (isKnownCrawler) {
            signals.push('KNOWN_CRAWLER_UA');
            score = Math.min(score + 30, 30);
            return {
                score,
                classification: 'KNOWN_CRAWLER',
                action: 'ALLOW',
                signals,
            };
        }
        // Match against malicious/automation bot patterns
        for (const { pattern, score: patternScore, label } of KNOWN_BOT_PATTERNS) {
            if (pattern.test(ua)) {
                score = Math.max(score, patternScore); // take the highest match
                signals.push(`BOT_PATTERN:${label}`);
            }
        }
        // Header-based heuristics
        const headers = req.headers ?? {};
        if (!headers['accept-language'] && !headers['Accept-Language']) {
            signals.push('MISSING_ACCEPT_LANGUAGE');
            score = Math.min(score + 15, 100);
        }
        if (!headers['accept'] && !headers['Accept']) {
            signals.push('MISSING_ACCEPT_HEADER');
            score = Math.min(score + 10, 100);
        }
        if (headers['x-automated'] === 'true' || headers['X-Automated'] === 'true') {
            signals.push('X_AUTOMATED_HEADER');
            score = Math.min(score + 30, 100);
        }
        // Classify based on score
        let classification;
        let action;
        if (score >= BLOCK_THRESHOLD) {
            classification = 'CONFIRMED_BOT';
            action = 'BLOCK';
            StructuredLogger_1.StructuredLogger.warn(`[BotDetection] BLOCKED score=${score}`, { ua: ua.substring(0, 100), signals });
        }
        else if (score >= FLAG_THRESHOLD) {
            classification = 'SUSPECTED_BOT';
            action = 'FLAG';
            StructuredLogger_1.StructuredLogger.warn(`[BotDetection] FLAGGED score=${score}`, { ua: ua.substring(0, 100), signals });
        }
        else {
            classification = 'HUMAN';
            action = 'ALLOW';
        }
        return { score, classification, action, signals };
    }
}
exports.BotDetectionService = BotDetectionService;
//# sourceMappingURL=BotDetectionService.js.map