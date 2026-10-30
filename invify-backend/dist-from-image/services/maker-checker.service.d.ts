import { Request, Response } from 'express';
export type MakerCheckerDomain = 'pos_switchboard' | 'staff_management' | 'tenant_billing';
export type MakerCheckerAction = 'routing_config' | 'quasar_base_url' | 'user_create' | 'user_update' | 'user_reset_mfa' | 'user_reset_password' | 'staff_invite' | 'create_plan' | 'post_payment';
type MakerSnapshot = {
    id: string;
    email: string;
    role: string;
    tenantId: string | null;
};
export type MakerCheckerRequest = {
    id: string;
    domain: MakerCheckerDomain;
    action: MakerCheckerAction;
    target: string;
    summary: string;
    body: Record<string, any>;
    params: Record<string, any>;
    maker: MakerSnapshot;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    decidedAt?: string;
    checkerEmail?: string;
};
export declare function makerCheckerPublicView(row: MakerCheckerRequest): {
    id: string;
    domain: MakerCheckerDomain;
    action: MakerCheckerAction;
    target: string;
    summary: string;
    makerEmail: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    decidedAt: string | null;
    checkerEmail: string | null;
};
export declare function isMakerCheckerApply(req: Request): boolean;
export declare class MakerCheckerService {
    static propose(input: {
        domain: MakerCheckerDomain;
        action: MakerCheckerAction;
        target?: string;
        summary: string;
        body?: Record<string, any>;
        params?: Record<string, any>;
        maker: MakerSnapshot;
    }): MakerCheckerRequest;
    static list(domain?: string): MakerCheckerRequest[];
    static peek(id: string): MakerCheckerRequest | undefined;
    static approve(id: string, actorEmail: string): Promise<{
        request: {
            id: string;
            domain: MakerCheckerDomain;
            action: MakerCheckerAction;
            target: string;
            summary: string;
            makerEmail: string;
            status: "pending" | "approved" | "rejected";
            createdAt: string;
            decidedAt: string | null;
            checkerEmail: string | null;
        };
        result: any;
    }>;
    static reject(id: string, actorEmail: string): {
        id: string;
        domain: MakerCheckerDomain;
        action: MakerCheckerAction;
        target: string;
        summary: string;
        makerEmail: string;
        status: "pending" | "approved" | "rejected";
        createdAt: string;
        decidedAt: string | null;
        checkerEmail: string | null;
    };
    static notifyRejectedBilling(row: MakerCheckerRequest): Promise<void>;
}
export declare function submitSupportChange(req: Request, input: {
    domain: MakerCheckerDomain;
    action: MakerCheckerAction;
    target?: string;
    summary: string;
    body?: Record<string, any>;
    params?: Record<string, any>;
}): MakerCheckerRequest;
export declare function holdForSupportApproval(req: Request, res: Response, input: {
    domain: MakerCheckerDomain;
    action: MakerCheckerAction;
    target?: string;
    summary: string;
    body?: Record<string, any>;
    params?: Record<string, any>;
}): Promise<boolean>;
export {};
