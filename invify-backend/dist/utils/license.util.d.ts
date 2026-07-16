export declare class LicenseGenerator {
    private static readonly hmacSecret;
    static encodeSuffix(suffix: string): number;
    static generateBusinessHash(name: string): number;
    static encodeBase32(buffer: Buffer): string;
    static generate(businessName: string, durationDays: number, planIndex: number, deviceSuffix: string): string;
}
