// invify-backend/src/services/observability/secret-sanitizer.ts

/**
 * SecretSanitizer
 * Deterministic multi-pass redactor for logs, headers, URLs, and telemetry payloads.
 * Ensures zero secrets, JWTs, refresh tokens, passwords, MFA secrets, or environment
 * files are exposed to the Observability UI.
 */
export class SecretSanitizer {
  // Regex for JWT tokens (header.payload.signature)
  private static readonly JWT_REGEX = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]+\b/g;

  // Regex for Bearer tokens
  private static readonly BEARER_REGEX = /\bBearer\s+(?!\[REDACTED)[A-Za-z0-9._~+/-]+=*/gi;

  // Regex for Authorization headers
  private static readonly AUTH_HEADER_REGEX = /\b(authorization\s*:\s*)(?!\[REDACTED)[^\r\n,;]+/gi;

  // Regex for Set-Cookie headers
  private static readonly SET_COOKIE_REGEX = /\b(set-cookie\s*:\s*)(?!\[REDACTED)[^\r\n;]+/gi;

  // Regex for Cookie headers (explicit negative lookbehind prevents matching Set-Cookie)
  private static readonly COOKIE_REGEX = /(?<!set-)\b(cookie\s*:\s*)(?!\[REDACTED)[^\r\n;]+/gi;

  // Regex for database URIs with passwords (postgres, mysql, mongodb, redis)
  private static readonly DB_URI_REGEX = /((?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^:]+:)[^@]+(@[^\s"']+)/gi;

  // Regex for AWS / Cloud access keys
  private static readonly AWS_KEY_REGEX = /\b(AKIA[0-9A-Z]{16})\b/g;

  // Regex for URL query strings containing sensitive params
  private static readonly URL_SENSITIVE_QUERY_REGEX =
    /([?&](?:token|code|otp|password|secret|key|api_key|access_token|refresh_token)=)(?!\[REDACTED)[^&\s#]+/gi;

  // Regex for 6-digit OTP codes preceded by otp/code/pin/totp
  private static readonly OTP_REGEX = /\b(?:otp|code|pin|totp)\s*[:=]\s*["']?(\d{6})["']?\b/gi;

  // Regex for common sensitive key-value patterns (e.g. password=..., secret=..., token=...)
  // Uses negative lookahead so already redacted items (like [REDACTED_JWT]) are not double-redacted
  private static readonly SENSITIVE_KV_REGEX =
    /((?:password|passwd|secret|token|api[_-]?key|private[_-]?key|mfa[_-]?secret|refresh[_-]?token|service[_-]?role|access[_-]?key)\s*[:=]\s*["']?)(?!\[REDACTED)[^"',\s;&]+/gi;

  /**
   * Sanitizes a plain text log string or message.
   */
  public static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') return '';

    let text = input;

    // 1. Redact URL query parameters
    text = text.replace(this.URL_SENSITIVE_QUERY_REGEX, '$1[REDACTED]');

    // 2. Redact Cloud access keys
    text = text.replace(this.AWS_KEY_REGEX, '[REDACTED_CLOUD_KEY]');

    // 3. Redact DB URIs
    text = text.replace(this.DB_URI_REGEX, '$1[REDACTED_PASS]$2');

    // 4. Redact Authorization headers
    text = text.replace(this.AUTH_HEADER_REGEX, '$1[REDACTED_HEADER]');

    // 5. Redact Set-Cookie headers first
    text = text.replace(this.SET_COOKIE_REGEX, '$1[REDACTED_COOKIE]');

    // 6. Redact Cookie headers (without matching Set-Cookie)
    text = text.replace(this.COOKIE_REGEX, '$1[REDACTED_COOKIE]');

    // 7. Redact Bearer tokens
    text = text.replace(this.BEARER_REGEX, 'Bearer [REDACTED_TOKEN]');

    // 8. Redact JWTs
    text = text.replace(this.JWT_REGEX, '[REDACTED_JWT]');

    // 9. Redact sensitive key-value pairs (ignoring already redacted markers)
    text = text.replace(this.SENSITIVE_KV_REGEX, '$1[REDACTED_VALUE]');

    // 10. Redact OTP codes
    text = text.replace(this.OTP_REGEX, 'otp:[REDACTED_OTP]');

    return text;
  }

  /**
   * Deeply sanitizes an object, array, or primitive before serializing as JSON.
   */
  public static sanitizeObject<T>(obj: T, depth = 0): T {
    if (depth > 8 || obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj) as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, depth + 1)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        // Disallow entire keys that represent credentials or sensitive headers
        if (
          lowerKey.includes('secret') ||
          lowerKey.includes('password') ||
          lowerKey.includes('token') ||
          lowerKey.includes('mfasecret') ||
          lowerKey.includes('privatekey') ||
          lowerKey.includes('apikey') ||
          lowerKey === 'authorization' ||
          lowerKey === 'cookie' ||
          lowerKey === 'set-cookie'
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeObject(value, depth + 1);
        }
      }
      return sanitized as T;
    }

    return obj;
  }
}
