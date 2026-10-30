/**
 * Validates a user-supplied URL to prevent Server-Side Request Forgery (SSRF).
 * Blocks loopback, private IPv4/IPv6 ranges, link-local, and cloud metadata endpoints.
 */
export declare function validateSafeUrl(rawUrl: string, allowHttpForLocal?: boolean): {
    isValid: boolean;
    error?: string;
};
