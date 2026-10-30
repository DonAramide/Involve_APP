export type InvifyPartnerVertical = 'invify_retail' | 'invify_school' | 'invify_services';
export declare function normalizePartnerVertical(raw?: string): InvifyPartnerVertical;
export declare function verticalFromKeyName(keyName?: string): InvifyPartnerVertical | null;
export declare function resolveQuasarPartnerCredentials(verticalRaw?: string): Promise<{
    vertical: InvifyPartnerVertical;
    clientId: string;
    clientSecret: string;
    source: string;
}>;
export declare function pingQuasarWithPartnerCreds(clientId: string, clientSecret: string): Promise<{
    ok: boolean;
    httpStatus: number | null;
    latencyMs: number;
    detail: string;
}>;
export declare function testQuasarPartnerVertical(verticalRaw?: string): Promise<{
    ok: boolean;
    httpStatus: number | null;
    latencyMs: number;
    detail: string;
    vertical: InvifyPartnerVertical;
    source: string;
    clientId: string;
}>;
export declare function testAllQuasarPartnerVerticals(): Promise<{
    ok: boolean;
    httpStatus: number | null;
    latencyMs: number;
    detail: string;
    vertical: InvifyPartnerVertical;
    source: string;
    clientId: string;
}[]>;
