export declare function resolveTenantActivationEmail(tenant: {
    owner_email?: string | null;
} | null | undefined, users: Array<{
    email?: string | null;
    role?: string | null;
}> | null | undefined): string | null;
export declare function deliverApprovedTerminalActivation(activation: {
    tenant_id: string;
    activation_code: string;
    duration_days?: number | null;
    plan_index?: number | null;
    device_suffix?: string | null;
    expires_at?: string | null;
}): Promise<{
    sent: boolean;
    to: string | null;
    error?: string;
}>;
