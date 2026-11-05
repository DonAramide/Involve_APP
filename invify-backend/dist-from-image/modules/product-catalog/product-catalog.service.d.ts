export interface MasterProduct {
    id: string;
    productCode: string;
    name: string;
    category: 'CORE_OS' | 'FINANCE' | 'HARDWARE' | 'HEALTH' | 'AI' | 'BILLING';
    description: string;
    features: string[];
    basePriceKobo: number;
    currency: string;
    billingModel: 'MONTHLY' | 'TERMLY' | 'ANNUAL' | 'PER_TRANSACTION';
    supportedTenantCategories: string[];
    publicationStatus: 'PUBLISHED' | 'DRAFT' | 'RETIRED';
    version: string;
    hmoEligible: boolean;
}
export interface HmoProductOffer {
    id: string;
    hmoAgentId: string;
    productId: string;
    productName: string;
    productCode: string;
    category: string;
    basePriceKobo: number;
    hmoAdjustmentKobo: number;
    tenantPriceKobo: number;
    billingModel: string;
    currency: string;
    isPublished: boolean;
    effectiveDate: string;
    auditTrail: {
        updatedBy: string;
        previousPriceKobo: number;
        newPriceKobo: number;
        reason: string;
        timestamp: string;
    }[];
}
export interface TenantProductAssignment {
    id: string;
    hmoAgentId: string;
    tenantId: string;
    tenantName: string;
    productId: string;
    productName: string;
    offerId: string;
    effectivePriceKobo: number;
    billingModel: string;
    status: 'ACTIVE' | 'PENDING_PROVISIONING' | 'SUSPENDED';
    assignedAt: string;
    assignedBy: string;
}
export declare const MASTER_PRODUCT_CATALOGUE: MasterProduct[];
export declare class ProductCatalogService {
    /**
     * List Super Admin published catalogue products eligible for distribution by this HMO
     */
    getPublishedCatalog(hmoAgentId: string): Promise<MasterProduct[]>;
    /**
     * Retrieve an individual master product by code or ID (Strictly read-only)
     */
    getMasterProduct(productId: string): Promise<MasterProduct | null>;
    /**
     * Get all product offers configured by the HMO
     */
    getHmoOffers(hmoAgentId: string): Promise<HmoProductOffer[]>;
    /**
     * Configure HMO tenant-facing pricing for a product offer (Phase 5 Pricing Controls)
     */
    configureOfferPrice(hmoAgentId: string, productId: string, hmoAdjustmentKobo: number, actorId: string, reason?: string): Promise<HmoProductOffer>;
    /**
     * Assign a published product offer to an authorized school tenant
     */
    assignProductToTenant(hmoAgentId: string, tenantId: string, productId: string, actorId: string): Promise<TenantProductAssignment>;
    /**
     * List all product assignments managed by the HMO
     */
    listTenantAssignments(hmoAgentId: string): Promise<TenantProductAssignment[]>;
    /**
     * Revoke product assignment from tenant
     */
    revokeTenantAssignment(hmoAgentId: string, assignmentId: string): Promise<boolean>;
    /**
     * Verify whether the HMO agent owns / administers the given tenant ID
     */
    verifyHmoTenantAccess(hmoAgentId: string, tenantId: string): Promise<boolean>;
}
export declare const productCatalogService: ProductCatalogService;
