export interface RecoveryIncident {
    id: string;
    component: 'PROVIDER' | 'STATE_REPAIR' | 'QUEUE_RECOVERY';
    description: string;
    resolution_action: 'FAILOVER' | 'RECONCILED' | 'RETRIED';
    status: 'PENDING' | 'RESOLVING' | 'RESOLVED';
    created_at: string;
    resolved_at: string | null;
}
export declare class RecoveryRegistry {
    private static mockIncidents;
    private static useMock;
    static clearMockData(): void;
    static getMockIncidents(): RecoveryIncident[];
    static insertIncident(incident: Partial<RecoveryIncident>): Promise<RecoveryIncident>;
    static updateIncident(id: string, updates: Partial<RecoveryIncident>): Promise<void>;
}
