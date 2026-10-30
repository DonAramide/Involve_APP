/**
 * SecretSanitizer
 * Deterministic multi-pass redactor for logs, headers, URLs, and telemetry payloads.
 * Ensures zero secrets, JWTs, refresh tokens, passwords, MFA secrets, or environment
 * files are exposed to the Observability UI.
 */
export declare class SecretSanitizer {
    private static readonly JWT_REGEX;
    private static readonly BEARER_REGEX;
    private static readonly AUTH_HEADER_REGEX;
    private static readonly SET_COOKIE_REGEX;
    private static readonly COOKIE_REGEX;
    private static readonly DB_URI_REGEX;
    private static readonly AWS_KEY_REGEX;
    private static readonly URL_SENSITIVE_QUERY_REGEX;
    private static readonly OTP_REGEX;
    private static readonly SENSITIVE_KV_REGEX;
    /**
     * Sanitizes a plain text log string or message.
     */
    static sanitizeString(input: string): string;
    /**
     * Deeply sanitizes an object, array, or primitive before serializing as JSON.
     */
    static sanitizeObject<T>(obj: T, depth?: number): T;
}
