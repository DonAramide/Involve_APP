export declare class LicenseGenerator {
    private static get hmacSecret();
    static encodeSuffix(suffix: string): number;
    static generateBusinessHash(name: string): number;
    static encodeBase32(buffer: Buffer): string;
    static generate(businessName: string, durationDays: number, planIndex: number, deviceSuffix: string): string;
    /** Server-side validation — clients must call an API, not embed the HMAC secret. */
    static validate(key: string, businessName: string): {
        valid: boolean;
        expiryTs?: number;
        planIndex?: number;
        licenseId?: number;
    };
}
