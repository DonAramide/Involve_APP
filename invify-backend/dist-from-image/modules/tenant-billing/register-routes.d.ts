export declare const TENANT_BILLING_ROUTE_PATHS: readonly ["/tenant-billing/overview", "/tenant-billing/accounts", "/tenant-billing/obligations", "/tenant-billing/plans", "/tenant-billing/installments", "/tenant-billing/subscriptions", "/tenant-billing/payments/preview", "/tenant-billing/payments", "/tenant-billing/payments/:id/reverse", "/tenant-billing/tenants/:tenantId", "/tenant-billing/overdue", "/tenant-billing/reports"];
export declare function attachTenantBillingRoutes(app: any): void;
export declare const attach: typeof attachTenantBillingRoutes;
