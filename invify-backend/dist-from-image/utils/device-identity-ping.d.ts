export declare function buildIdentityPingPayload(tenantId?: string | null): {
    requestId: `${string}-${string}-${string}-${string}-${string}`;
    tenantId: string | null;
    ts: string;
};
export declare function emitIdentityPing(io: {
    in: (room: string) => {
        fetchSockets: () => Promise<unknown[]>;
    };
    to: (room: string) => {
        emit: (event: string, payload: unknown) => void;
    };
}, tenantId: string): Promise<{
    onlineSockets: number;
    requestId: string;
    room: string;
}>;
