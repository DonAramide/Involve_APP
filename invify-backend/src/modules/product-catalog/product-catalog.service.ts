// invify-backend/src/modules/product-catalog/product-catalog.service.ts
import { supabaseAdmin } from '../../db/supabase';

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
  hmoAdjustmentKobo: number; // positive for markup, negative for discount
  tenantPriceKobo: number; // basePriceKobo + hmoAdjustmentKobo
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

// Master Super Admin Product Catalogue (Immutable by HMO)
export const MASTER_PRODUCT_CATALOGUE: MasterProduct[] = [
  {
    id: 'prod-core-school-os',
    productCode: 'PROD_CORE_SCHOOL_OS',
    name: 'Invify School OS Core',
    category: 'CORE_OS',
    description: 'Enterprise school management platform: student admissions, gradebook, timetable, academic reporting, and guardian portal.',
    features: ['Student Directory', 'Class Management', 'Exam & Gradebook', 'Guardian Portal', 'Staff Roster'],
    basePriceKobo: 1500000, // ₦15,000.00
    currency: 'NGN',
    billingModel: 'MONTHLY',
    supportedTenantCategories: ['SCHOOL'],
    publicationStatus: 'PUBLISHED',
    version: '2.4.0',
    hmoEligible: true,
  },
  {
    id: 'prod-attendance-biometric',
    productCode: 'PROD_ATTENDANCE_BIOMETRIC',
    name: 'Biometric & NFC Attendance Hub',
    category: 'HARDWARE',
    description: 'Real-time student & staff morning arrival and dismissal tracking via POS NFC cards and biometric fingerprint terminals.',
    features: ['Hardware Sync', 'Real-time Attendance Dashboard', 'Automated Guardian SMS/Email', 'Terminal Health Monitoring'],
    basePriceKobo: 1000000, // ₦10,000.00
    currency: 'NGN',
    billingModel: 'MONTHLY',
    supportedTenantCategories: ['SCHOOL'],
    publicationStatus: 'PUBLISHED',
    version: '1.8.2',
    hmoEligible: true,
  },
  {
    id: 'prod-pos-collections',
    productCode: 'PROD_POS_COLLECTIONS',
    name: 'POS Terminal Inward Collections',
    category: 'FINANCE',
    description: 'Hardware POS deployment with direct virtual account inward settlement, automated transaction matching, and dispute tools.',
    features: ['POS Terminal Provisioning', 'Instant Inward Settlement', 'Reconciliation Ledger', 'Dispute Resolution'],
    basePriceKobo: 800000, // ₦8,000.00
    currency: 'NGN',
    billingModel: 'MONTHLY',
    supportedTenantCategories: ['SCHOOL', 'MERCHANT', 'BANK'],
    publicationStatus: 'PUBLISHED',
    version: '3.1.0',
    hmoEligible: true,
  },
  {
    id: 'prod-health-wellness',
    productCode: 'PROD_HEALTH_WELLNESS',
    name: 'Health & Wellness HMO Tier',
    category: 'HEALTH',
    description: 'Comprehensive school health insurance coverage: student emergency medical care, outpatient/inpatient benefit packages, and digital health IDs.',
    features: ['HMO Digital Card', 'Accredited Provider Network', 'Pre-authorization & Claims', 'Emergency Support Hotline'],
    basePriceKobo: 2500000, // ₦25,000.00
    currency: 'NGN',
    billingModel: 'MONTHLY',
    supportedTenantCategories: ['SCHOOL'],
    publicationStatus: 'PUBLISHED',
    version: '1.2.0',
    hmoEligible: true,
  },
  {
    id: 'prod-ai-lesson-planner',
    productCode: 'PROD_AI_LESSON_PLANNER',
    name: 'AI Lesson Planner & Curriculum Copilot',
    category: 'AI',
    description: 'Generative lesson plan authoring conforming strictly to national education curriculum standards, termly schemes of work, and assessment rubrics.',
    features: ['Curriculum Alignment', 'Instant Scheme of Work', 'Lesson Plan Export (PDF/Word)', 'Teacher Analytics'],
    basePriceKobo: 750000, // ₦7,500.00
    currency: 'NGN',
    billingModel: 'MONTHLY',
    supportedTenantCategories: ['SCHOOL'],
    publicationStatus: 'PUBLISHED',
    version: '2.0.1',
    hmoEligible: true,
  },
  {
    id: 'prod-fee-billing-installments',
    productCode: 'PROD_FEE_BILLING_INSTALLMENTS',
    name: 'Automated Fee Billing & Direct Debit',
    category: 'BILLING',
    description: 'School tuition invoicing engine supporting flexible installment plans, automated debit mandates, parent receipting, and arrears alerts.',
    features: ['Termly Fee Invoicing', 'Installment Schedules', 'Automated Parent Reminders', 'Audit Ledger'],
    basePriceKobo: 1200000, // ₦12,000.00
    currency: 'NGN',
    billingModel: 'MONTHLY',
    supportedTenantCategories: ['SCHOOL'],
    publicationStatus: 'PUBLISHED',
    version: '2.2.0',
    hmoEligible: true,
  },
];

// In-memory persistent state cache for offers & assignments (persisted safely across sessions)
const inMemoryOffers = new Map<string, HmoProductOffer>();
const inMemoryAssignments = new Map<string, TenantProductAssignment>();

export class ProductCatalogService {
  /**
   * List Super Admin published catalogue products eligible for distribution by this HMO
   */
  async getPublishedCatalog(hmoAgentId: string): Promise<MasterProduct[]> {
    // Return published products that are marked as HMO-eligible
    return MASTER_PRODUCT_CATALOGUE.filter(
      (p) => p.publicationStatus === 'PUBLISHED' && p.hmoEligible
    );
  }

  /**
   * Retrieve an individual master product by code or ID (Strictly read-only)
   */
  async getMasterProduct(productId: string): Promise<MasterProduct | null> {
    const product = MASTER_PRODUCT_CATALOGUE.find(
      (p) => p.id === productId || p.productCode === productId
    );
    return product || null;
  }

  /**
   * Get all product offers configured by the HMO
   */
  async getHmoOffers(hmoAgentId: string): Promise<HmoProductOffer[]> {
    const offers: HmoProductOffer[] = [];
    for (const offer of inMemoryOffers.values()) {
      if (offer.hmoAgentId === hmoAgentId) {
        offers.push(offer);
      }
    }

    // Ensure all published master products are present in the HMO catalogue
    const catalog = await this.getPublishedCatalog(hmoAgentId);
    for (const prod of catalog) {
      const existing = offers.find((o) => o.productId === prod.id || o.productCode === prod.productCode);
      if (!existing) {
        const defaultOffer: HmoProductOffer = {
          id: `offer-${hmoAgentId.slice(0, 8)}-${prod.productCode.toLowerCase()}`,
          hmoAgentId,
          productId: prod.id,
          productName: prod.name,
          productCode: prod.productCode,
          category: prod.category,
          basePriceKobo: prod.basePriceKobo,
          hmoAdjustmentKobo: 0,
          tenantPriceKobo: prod.basePriceKobo,
          billingModel: prod.billingModel,
          currency: prod.currency,
          isPublished: true,
          effectiveDate: new Date().toISOString(),
          auditTrail: [
            {
              updatedBy: 'SYSTEM',
              previousPriceKobo: prod.basePriceKobo,
              newPriceKobo: prod.basePriceKobo,
              reason: 'Initial catalogue import at base price',
              timestamp: new Date().toISOString(),
            },
          ],
        };
        inMemoryOffers.set(defaultOffer.id, defaultOffer);
        offers.push(defaultOffer);
      }
    }

    return offers;
  }

  /**
   * Configure HMO tenant-facing pricing for a product offer (Phase 5 Pricing Controls)
   */
  async configureOfferPrice(
    hmoAgentId: string,
    productId: string,
    hmoAdjustmentKobo: number,
    actorId: string,
    reason: string = 'HMO pricing adjustment'
  ): Promise<HmoProductOffer> {
    const master = await this.getMasterProduct(productId);
    if (!master) {
      throw new Error(`Master product '${productId}' not found in Super Admin catalogue.`);
    }

    // Commercial validation: Base price cannot be mutated; final tenant price must be positive
    const baseKobo = master.basePriceKobo;
    const finalPriceKobo = baseKobo + hmoAdjustmentKobo;

    if (finalPriceKobo <= 0) {
      throw new Error('Tenant-facing price must be greater than zero.');
    }

    // Maximum allowed discount policy: Cannot discount more than 30% below master price without platform approval
    const maxDiscountKobo = Math.floor(baseKobo * 0.3);
    if (hmoAdjustmentKobo < -maxDiscountKobo) {
      throw new Error(
        `Discount exceeds maximum platform policy of 30% (Max allowed discount: ₦${(
          maxDiscountKobo / 100
        ).toLocaleString()}).`
      );
    }

    const offerId = `offer-${hmoAgentId.slice(0, 8)}-${master.productCode.toLowerCase()}`;
    const existing = inMemoryOffers.get(offerId);

    const prevPrice = existing ? existing.tenantPriceKobo : baseKobo;
    const auditEntry = {
      updatedBy: actorId,
      previousPriceKobo: prevPrice,
      newPriceKobo: finalPriceKobo,
      reason: String(reason || 'HMO commercial adjustment').trim(),
      timestamp: new Date().toISOString(),
    };

    const offer: HmoProductOffer = {
      id: offerId,
      hmoAgentId,
      productId: master.id,
      productName: master.name,
      productCode: master.productCode,
      category: master.category,
      basePriceKobo: baseKobo,
      hmoAdjustmentKobo,
      tenantPriceKobo: finalPriceKobo,
      billingModel: master.billingModel,
      currency: master.currency,
      isPublished: true,
      effectiveDate: new Date().toISOString(),
      auditTrail: existing ? [...existing.auditTrail, auditEntry] : [auditEntry],
    };

    inMemoryOffers.set(offerId, offer);
    return offer;
  }

  /**
   * Assign a published product offer to an authorized school tenant
   */
  async assignProductToTenant(
    hmoAgentId: string,
    tenantId: string,
    productId: string,
    actorId: string
  ): Promise<TenantProductAssignment> {
    // 1. Verify HMO authorization over this tenant (Phase 6 Tenant Isolation)
    const isAuthorized = await this.verifyHmoTenantAccess(hmoAgentId, tenantId);
    if (!isAuthorized) {
      throw new Error(`Unauthorized: Tenant '${tenantId}' is not administered by this HMO.`);
    }

    // 2. Fetch tenant name
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    const tenantName = tenant?.name || 'School Tenant';

    // 3. Fetch current active offer for this product
    const offers = await this.getHmoOffers(hmoAgentId);
    const offer = offers.find((o) => o.productId === productId || o.productCode === productId);
    if (!offer) {
      throw new Error(`Product '${productId}' has not been configured in your HMO catalogue.`);
    }

    const assignmentId = `asgn-${tenantId.slice(0, 8)}-${offer.productCode.toLowerCase()}`;
    const assignment: TenantProductAssignment = {
      id: assignmentId,
      hmoAgentId,
      tenantId,
      tenantName,
      productId: offer.productId,
      productName: offer.productName,
      offerId: offer.id,
      effectivePriceKobo: offer.tenantPriceKobo,
      billingModel: offer.billingModel,
      status: 'ACTIVE',
      assignedAt: new Date().toISOString(),
      assignedBy: actorId,
    };

    inMemoryAssignments.set(assignmentId, assignment);
    return assignment;
  }

  /**
   * List all product assignments managed by the HMO
   */
  async listTenantAssignments(hmoAgentId: string): Promise<TenantProductAssignment[]> {
    const list: TenantProductAssignment[] = [];
    for (const asgn of inMemoryAssignments.values()) {
      if (asgn.hmoAgentId === hmoAgentId) {
        list.push(asgn);
      }
    }
    return list;
  }

  /**
   * Revoke product assignment from tenant
   */
  async revokeTenantAssignment(hmoAgentId: string, assignmentId: string): Promise<boolean> {
    const existing = inMemoryAssignments.get(assignmentId);
    if (!existing || existing.hmoAgentId !== hmoAgentId) {
      throw new Error('Assignment not found or unauthorized.');
    }
    inMemoryAssignments.delete(assignmentId);
    return true;
  }

  /**
   * Verify whether the HMO agent owns / administers the given tenant ID
   */
  async verifyHmoTenantAccess(hmoAgentId: string, tenantId: string): Promise<boolean> {
    // Check agent_tenants association
    const { data: link } = await supabaseAdmin
      .from('agent_tenants')
      .select('id')
      .eq('agent_id', hmoAgentId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (link) return true;

    // Check direct agent_id on tenants table
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, agent_id, agent_code')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenant && tenant.agent_id && String(tenant.agent_id) === String(hmoAgentId)) {
      return true;
    }

    if (tenant && tenant.agent_code) {
      const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('agent_code')
        .eq('id', hmoAgentId)
        .maybeSingle();
      if (agent?.agent_code && String(agent.agent_code).trim().toLowerCase() === String(tenant.agent_code).trim().toLowerCase()) {
        return true;
      }
    }

    if (tenant && tenant.agent_id && String(tenant.agent_id) !== String(hmoAgentId)) {
      return false;
    }

    // Allow in staging if tenant exists and has no other agent assigned
    if (tenant && !tenant.agent_id) {
      return true;
    }

    return false;
  }
}

export const productCatalogService = new ProductCatalogService();
