"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeQuasarBaseUrl = normalizeQuasarBaseUrl;
exports.invalidateQuasarBaseUrlCache = invalidateQuasarBaseUrlCache;
exports.setQuasarBaseUrlOverride = setQuasarBaseUrlOverride;
exports.resolveQuasarBaseUrl = resolveQuasarBaseUrl;
exports.quasarCardTransactionUrl = quasarCardTransactionUrl;
exports.quasarIccDataUrl = quasarIccDataUrl;
/**
 * Resolve Quasar API base URL (…/api/v1).
 *
 * Priority:
 *  1. Explicit override (set when superadmin saves Platform Config / POS Switch Board)
 *  2. global_settings.json → quasar_base_url
 *  3. process.env.QUASAR_BASE_URL
 *  4. Production default
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const PRODUCTION_DEFAULT = 'https://api-quasar.invify.org/api/v1';
/** Only set via setQuasarBaseUrlOverride after an admin save. */
let explicitOverride = null;
const STRIP_SUFFIXES = [
    '/pos/card-transaction',
    '/pos/icc-data',
    '/pos/transactionFromMpos',
    '/pos/icc',
];
/** Normalize to …/api/v1 without trailing slash. Accepts full card-tx URLs. */
function normalizeQuasarBaseUrl(input) {
    let u = String(input || '').trim();
    if (!u)
        return '';
    u = u.split('?')[0].split('#')[0];
    u = u.replace(/\/+$/, '');
    for (const suffix of STRIP_SUFFIXES) {
        if (u.toLowerCase().endsWith(suffix)) {
            u = u.slice(0, -suffix.length).replace(/\/+$/, '');
            break;
        }
    }
    return u;
}
function readFromGlobalSettingsFile() {
    try {
        const settingsPath = path.join(process.cwd(), 'global_settings.json');
        if (!fs.existsSync(settingsPath))
            return '';
        const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        return normalizeQuasarBaseUrl(raw?.quasar_base_url || raw?.quasarBaseUrl || '');
    }
    catch {
        return '';
    }
}
function invalidateQuasarBaseUrlCache() {
    explicitOverride = null;
}
/** Call after superadmin saves quasar_base_url so new clients pick it up immediately. */
function setQuasarBaseUrlOverride(url) {
    const normalized = normalizeQuasarBaseUrl(url);
    explicitOverride = normalized || null;
}
function resolveQuasarBaseUrl() {
    if (explicitOverride)
        return explicitOverride;
    const fromFile = readFromGlobalSettingsFile();
    if (fromFile)
        return fromFile;
    const fromEnv = normalizeQuasarBaseUrl(process.env.QUASAR_BASE_URL);
    if (fromEnv)
        return fromEnv;
    return PRODUCTION_DEFAULT;
}
function quasarCardTransactionUrl() {
    return `${resolveQuasarBaseUrl()}/pos/card-transaction`;
}
function quasarIccDataUrl() {
    return `${resolveQuasarBaseUrl()}/pos/icc-data`;
}
//# sourceMappingURL=quasar-base-url.js.map