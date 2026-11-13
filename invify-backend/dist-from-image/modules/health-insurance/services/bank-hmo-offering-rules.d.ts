/**
 * Bank offering status changes. The reference price stays on the published
 * plan version. This module does not calculate or store a bank price.
 */
export type OfferingAction = 'unchanged' | 'activated' | 'deactivated' | 'reactivated';
export type OfferingDecision = {
    ok: true;
    action: OfferingAction;
    nextActive: boolean;
} | {
    ok: false;
    status: number;
    code: string;
    message: string;
};
export declare function normalizeReason(value: unknown): string;
export declare function decideOfferingChange(input: {
    planVersionId: string;
    exists: boolean;
    currentActive: boolean | null;
    requestedActive: boolean;
    versionStatus: string | null;
    planStatus: string | null;
    reason: string;
}): OfferingDecision;
export declare function tenantSelectionDecision(input: {
    attributedToBank: boolean;
    offeringActive: boolean;
    versionPublished: boolean;
    planActive: boolean;
}): {
    allowed: boolean;
    code: string;
    message: string;
};
