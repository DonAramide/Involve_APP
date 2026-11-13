/** Nigerian numbers become 234… so Termii can accept them. Returns null when unusable. */
export declare function normalizeSmsPhone(value: unknown): string | null;
export declare function smsIsConfigured(): boolean;
export declare function sendPlainSms(to: string, message: string): Promise<{
    ok: boolean;
    error?: string;
}>;
