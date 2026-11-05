import { assertAgentOwns } from './agent-webhook-crypto';
export declare function resolveAgentFromAuth(authUserId: string): Promise<{
    id: any;
    agent_code: any;
    email: any;
    first_name: any;
    last_name: any;
    status: any;
}>;
export declare function getDeveloperSnapshot(authUserId: string, opts?: {
    revealApiPrivateIfNew?: boolean;
}): Promise<{
    agent: {
        id: any;
        agent_code: any;
        email: any;
    };
    webhook: any;
    webhook_signing: any;
    api_credentials: {
        private_key: string | null | undefined;
        private_key_shown: boolean;
        id: any;
        key_id: any;
        public_key: any;
        fingerprint: any;
        status: any;
        created_at: any;
        rotated_at: any;
        revoked_at: any;
    } | {
        private_key: string | null | undefined;
        private_key_shown: boolean;
        notice: string;
        id: `${string}-${string}-${string}-${string}-${string}`;
        agent_id: string;
        key_id: string;
        public_key: string;
        fingerprint: string;
        status: string;
        created_at: string;
        rotated_at: null;
        revoked_at: null;
    };
    stats: {
        total_events: number;
        failed_events: number;
        successful_events: number;
        success_rate: number;
    };
    notices: string[];
    payout_execution_enabled: boolean;
    fee_orchestration_live: boolean;
}>;
export declare function saveWebhook(authUserId: string, url: string, email: string): Promise<any>;
export declare function setWebhookStatus(authUserId: string, status: 'ENABLED' | 'DISABLED', email: string): Promise<any>;
export declare function rotateWebhookSigning(authUserId: string, email: string, confirm: boolean): Promise<any>;
export declare function rotateApiCredential(authUserId: string, email: string, confirm: boolean): Promise<{
    private_key: string;
    private_key_shown: boolean;
    notice: string;
    id: `${string}-${string}-${string}-${string}-${string}`;
    agent_id: any;
    key_id: string;
    public_key: string;
    fingerprint: string;
    status: string;
    created_at: string;
    rotated_at: string;
    revoked_at: null;
}>;
export declare function listDeliveries(authUserId: string): Promise<{
    event_id: any;
    event_type: any;
    tenant_id: any;
    commission: any;
    status: any;
    attempts: any;
    http_status: any;
    created_at: any;
    last_attempt_at: any;
}[]>;
export declare function enqueueCommissionEvent(input: {
    agentId: string;
    agentCode: string;
    type: string;
    tenantId?: string | null;
    assessmentId?: string | null;
    payload: Record<string, unknown>;
}): Promise<`${string}-${string}-${string}-${string}-${string}` | null>;
export declare function enqueueTestEvent(authUserId: string, email: string): Promise<{
    event_id: `${string}-${string}-${string}-${string}-${string}`;
    envelope: {
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
    financial_mutation: boolean;
}>;
export type WebhookTransport = (url: string, body: string, headers: Record<string, string>) => Promise<{
    status: number;
}>;
export declare function deliverDueEvents(transport?: WebhookTransport, now?: Date): Promise<({
    event_id: any;
    ok: boolean;
    http_status?: undefined;
} | {
    event_id: any;
    ok: boolean;
    http_status: number;
})[]>;
export declare function adminListWebhooks(): Promise<any[]>;
export declare function adminSetWebhookStatus(agentId: string, status: 'ENABLED' | 'DISABLED', email: string): Promise<any>;
export declare function adminListDeliveries(agentId: string): Promise<{
    event_id: any;
    event_type: any;
    tenant_id: any;
    commission: any;
    status: any;
    attempts: any;
    http_status: any;
    created_at: any;
    last_attempt_at: any;
}[]>;
export declare function verifyAgentApiRequest(keyId: string, timestamp: string, envelope: unknown, signature: string): Promise<{
    agent_id: any;
    key_id: any;
}>;
export { assertAgentOwns };
