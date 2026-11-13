export declare const WEBHOOK_EVENT_VERSION = "2026-01";
export declare const WEBHOOK_MAX_SKEW_SECONDS = 300;
export declare const WEBHOOK_TIMEOUT_MS = 5000;
export declare const WEBHOOK_MAX_ATTEMPTS = 8;
export declare const COMMISSION_EVENT_TYPES: readonly ["commission.assessed", "commission.pending", "commission.available", "commission.withdrawal.requested", "commission.withdrawal.approved", "commission.withdrawal.rejected", "commission.withdrawal.completed", "commission.withdrawal.failed", "webhook.test"];
export type CommissionEventType = (typeof COMMISSION_EVENT_TYPES)[number];
export declare function canonicalJson(value: unknown): string;
export declare function fingerprintPublicKey(publicKeyPem: string): string;
export declare function generateEd25519Keypair(purpose: 'WEBHOOK_SIGNING' | 'AGENT_API'): {
    purpose: "WEBHOOK_SIGNING" | "AGENT_API";
    key_id: string;
    public_key: string;
    private_key: string;
    fingerprint: string;
};
export declare function signingPayload(timestamp: string, envelope: unknown): Buffer;
export declare function signWebhook(privateKeyPem: string, timestamp: string, envelope: unknown): string;
export declare function verifyWebhook(publicKeyPem: string, timestamp: string, envelope: unknown, signatureB64: string): boolean;
export declare function isTimestampFresh(timestamp: string, nowMs?: number, maxSkewSeconds?: number): boolean;
export declare function validateWebhookUrl(raw: string): string;
export declare function allowedCommissionEvent(type: string, opts: {
    live: boolean;
    payouts: boolean;
}): boolean;
export declare function nextBackoffSeconds(attempt: number): number;
export declare function publicWebhookCredential(row: Record<string, unknown>): any;
export declare function assertNoSecrets(payload: unknown): void;
export declare function buildCommissionEnvelope(input: {
    id: string;
    type: string;
    agent: {
        id: string;
        agent_code: string;
    };
    tenant?: {
        id: string;
        tenant_code?: string | null;
    };
    transaction?: {
        id?: string | null;
        type?: string | null;
        reference?: string | null;
    };
    commission?: Record<string, unknown>;
    test?: boolean;
}): {
    id: string;
    type: string;
    version: string;
    created_at: string;
    agent: {
        id: string;
        agent_code: string;
    };
    tenant: {
        id: string;
        tenant_code?: string | null;
    } | null;
    transaction: {
        id?: string | null;
        type?: string | null;
        reference?: string | null;
    } | null;
    commission: Record<string, unknown> | null;
    test: boolean;
};
export declare function assertAgentOwns(resourceAgentId: string, authAgentId: string): void;
