export declare const PLATFORM_DEFAULT_TARGET = "default";
export type InstituteRef = {
    id: string | null;
    agent_code: string | null;
    name: string;
    email?: string | null;
    status?: string | null;
    isDefault: boolean;
};
export type InstitutePortProposal = {
    id: string;
    makerId: string;
    makerEmail: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    from: InstituteRef;
    to: InstituteRef;
    reason?: string;
    checkerId?: string;
    checkerEmail?: string;
    decidedAt?: string;
};
export type InstitutePortSnapshot = {
    tenantId: string;
    tenantName: string;
    current: InstituteRef;
    proposal: InstitutePortProposal | null;
    institutes: InstituteRef[];
    defaultCode: string;
};
export declare function samePortActor(proposal: {
    makerId?: string;
    makerEmail?: string;
}, actor: {
    id?: string;
    email?: string;
}): boolean;
export declare function normalizePortTargetId(raw: unknown): string | typeof PLATFORM_DEFAULT_TARGET;
export declare function instituteRefsEqual(a: InstituteRef, b: InstituteRef): boolean;
export declare function readPortProposal(settings: Record<string, any>): InstitutePortProposal | null;
export declare class TenantInstitutePortService {
    private readonly db;
    constructor(db?: any);
    getSnapshot(tenantId: string): Promise<InstitutePortSnapshot>;
    propose(opts: {
        tenantId: string;
        actorId: string;
        actorEmail: string;
        toAgentId?: unknown;
        reason?: string;
    }): Promise<InstitutePortSnapshot>;
    reject(opts: {
        tenantId: string;
        actorId: string;
        actorEmail: string;
        reason?: string;
    }): Promise<InstitutePortSnapshot>;
    approve(opts: {
        tenantId: string;
        actorId: string;
        actorEmail: string;
    }): Promise<InstitutePortSnapshot>;
    ownershipMap(tenantIds: string[]): Promise<Map<string, InstituteRef>>;
    private assertChecker;
    private requireTenant;
    private listInstitutes;
    private resolveCurrent;
    private resolveTarget;
    private applyOwnership;
    private setTenantAgentCode;
    private saveTenantSettings;
}
export declare const tenantInstitutePortService: TenantInstitutePortService;
