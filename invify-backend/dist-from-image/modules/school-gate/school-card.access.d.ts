import { CardActor } from './school-card.types';
export declare function assertRoleAllowed(role: string | null | undefined, allowed: string[], message?: string): void;
/** Tenant scope comes only from the authenticated profile. */
export declare function assertCardManager(user: CardActor | undefined): {
    userId: string;
    tenantId: string;
};
/** A scan uses the signed-in school account. Body, query, and header tenant values are ignored. */
export declare function assertScanOperator(user: CardActor | undefined): {
    userId: string;
    tenantId: string;
};
