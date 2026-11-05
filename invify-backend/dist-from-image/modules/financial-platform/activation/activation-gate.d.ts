export type ManualCheckKey = 'cac' | 'phone_call' | 'address';
export type ManualCheck = {
    passed: boolean;
    by?: string;
    email?: string;
    at?: string;
    notes?: string;
    checkerId?: string;
    checkerEmail?: string;
    checkerAt?: string;
};
export type ActivationProposal = {
    id: string;
    makerId: string;
    makerEmail: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    checkerId?: string;
    checkerEmail?: string;
    decidedAt?: string;
    reason?: string;
};
export type ActivationGate = {
    checks: Record<ManualCheckKey, ManualCheck>;
    proposal: ActivationProposal | null;
};
export declare const MANUAL_CHECK_KEYS: ManualCheckKey[];
/** A check counts only after a different admin checker-approves the maker's record. */
export declare function isManualCheckApproved(check?: ManualCheck | null): boolean;
export declare function allManualChecksPassed(gate: ActivationGate): boolean;
/**
 * Virtual accounts stay locked until the maker proposes activation and a
 * different admin checker-approves. Document checks alone are not enough.
 */
export declare function virtualAccountGenerationBlockReason(gate: ActivationGate): string | null;
export declare function missingManualChecks(gate: ActivationGate): string[];
export declare function loadActivationGate(tenantId: string): Promise<{
    gate: ActivationGate;
    settings: Record<string, any>;
    tenant: any;
}>;
export declare function evidenceForChecks(tenantId: string): Promise<{
    hasCac: boolean;
    hasId: boolean;
    cacUrl: string | null;
    idUrl: string | null;
    phone: string | null;
    address: string | null;
    kycStatus: any;
}>;
export declare function recordManualCheck(opts: {
    tenantId: string;
    key: ManualCheckKey;
    passed: boolean;
    actorId: string;
    actorEmail: string;
    notes?: string;
}): Promise<ActivationGate>;
export declare function approveManualCheck(opts: {
    tenantId: string;
    key: ManualCheckKey;
    actorId: string;
    actorEmail: string;
}): Promise<ActivationGate>;
export declare function proposeActivation(opts: {
    tenantId: string;
    actorId: string;
    actorEmail: string;
}): Promise<ActivationGate>;
export declare function rejectActivationProposal(opts: {
    tenantId: string;
    actorId: string;
    actorEmail: string;
    reason?: string;
}): Promise<ActivationGate>;
/** Throws 403/400 unless checks + pending proposal by a different maker. Does not persist. */
export declare function assertCheckerCanActivate(opts: {
    tenantId: string;
    actorId: string;
    actorEmail: string;
}): Promise<ActivationGate>;
/** Marks a pending proposal approved after the activation saga succeeds. */
export declare function markProposalApproved(opts: {
    tenantId: string;
    actorId: string;
    actorEmail: string;
}): Promise<ActivationGate>;
/** Throws 403/400 unless checks + pending proposal by a different maker. Marks approved. */
export declare function consumeApprovedActivation(opts: {
    tenantId: string;
    actorId: string;
    actorEmail: string;
}): Promise<ActivationGate>;
