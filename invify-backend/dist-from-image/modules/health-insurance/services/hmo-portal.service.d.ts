import { ResolvedInstitutionContext, HmoRole } from './institution-classification.service';
export declare class HmoPortalService {
    /**
     * Resolves whether authUserId exists in public.users(id).
     * Institute Portal logins live in auth.users + public.agents and may not have a row in public.users,
     * so nullable FK columns referencing public.users(id) (created_by, uploaded_by, approved_by, etc.)
     * must receive null when no public.users row exists.
     */
    private resolvePublicUserIdOrNull;
    /**
     * Resolves all tenant_ids linked to this HMO via:
     * 1. hw_hmo_school_links (provider_id)
     * 2. tenant_institution_relationships (institution_id + service_type = 'HEALTH_INSURANCE')
     * 3. hw_tenant_plan_offers joined to hw_plan_versions -> hw_plans (provider_id)
     */
    getParticipatingTenantIds(ctx: ResolvedInstitutionContext): Promise<string[]>;
    /**
     * Resolves all plan_ids and plan_version_ids belonging to this HMO provider.
     */
    getProviderPlanScope(providerId: string): Promise<{
        plans: any[];
        planIds: string[];
        versions: any[];
        versionIds: string[];
    }>;
    /**
     * 1. HMO Executive Dashboard Overview (12 KPIs, Charts, Tasks, Alerts, Quick Actions)
     */
    getDashboardOverview(ctx: ResolvedInstitutionContext): Promise<{
        institution: {
            id: string | null;
            code: string;
            name: string;
            institutionType: import("./institution-classification.service").CanonicalInstitutionType;
            portalMode: "BANK" | "HMO" | "RESTRICTED";
            approvalStatus: "ACTIVE" | "DRAFT" | "SUSPENDED" | "PENDING_APPROVAL" | "RETIRED";
            kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
            hmoProviderId: string | null;
            hmoProviderCode: string | null;
            hmoRole: HmoRole | null;
            permissions: import("./institution-classification.service").HmoPermission[];
        };
        hmoKpis: {
            totalRegisteredMembers: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            activeCoveredMembers: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            pendingEnrollmentConfirmations: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            suspendedOrExpiredMemberships: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            participatingSchools: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            registeredHospitals: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            pendingEnrollmentBatches: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            failedOrRejectedRows: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            pendingPreAuthorizations: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            pendingClaims: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            approvedClaimsAwaitingSettlement: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
            overdueOperationalTasks: {
                value: number;
                label: string;
                icon: string;
                color: string;
            };
        };
        charts: {
            enrollmentByPlan: {
                plan: string;
                count: number;
            }[];
            batchStatusBreakdown: {
                draft: number;
                readyForExport: number;
                awaitingResponse: number;
                partiallyProcessed: number;
                reconciled: number;
            };
            claimsByStatus: {
                submitted: number;
                pending: number;
                approved: number;
                rejected: number;
                settled: number;
            };
        };
        quickActions: {
            key: string;
            label: string;
            tab: string;
            icon: string;
            permission: string;
        }[];
        recentBatches: any[];
        tasks: any[];
    }>;
    /**
     * 2. HMO Organization Profile & Verification
     */
    getOrganizationProfile(ctx: ResolvedInstitutionContext): Promise<{
        providerId: string;
        institutionId: string | null;
        institutionCode: string;
        institutionType: string;
        legalName: any;
        tradingName: any;
        licenceReference: any;
        regulatorType: any;
        licenceExpiry: any;
        integrationStatus: any;
        approvalStatus: "ACTIVE" | "DRAFT" | "SUSPENDED" | "PENDING_APPROVAL" | "RETIRED";
        kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
        contactEmail: any;
        contactPhone: any;
        supportEmail: any;
        claimsEmail: any;
        headOfficeAddress: any;
        state: any;
        lga: any;
        websiteUrl: any;
        logoUrl: any;
        capabilities: any;
    }>;
    updateOrganizationProfile(ctx: ResolvedInstitutionContext, body: any): Promise<{
        providerId: string;
        institutionId: string | null;
        institutionCode: string;
        institutionType: string;
        legalName: any;
        tradingName: any;
        licenceReference: any;
        regulatorType: any;
        licenceExpiry: any;
        integrationStatus: any;
        approvalStatus: "ACTIVE" | "DRAFT" | "SUSPENDED" | "PENDING_APPROVAL" | "RETIRED";
        kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
        contactEmail: any;
        contactPhone: any;
        supportEmail: any;
        claimsEmail: any;
        headOfficeAddress: any;
        state: any;
        lga: any;
        websiteUrl: any;
        logoUrl: any;
        capabilities: any;
    }>;
    /**
     * 3. School & Employer Network Management
     */
    listSchoolNetwork(ctx: ResolvedInstitutionContext): Promise<{
        id: any;
        tenantId: any;
        schoolName: any;
        tenantType: any;
        onboardingStatus: any;
        contactPerson: any;
        contactEmail: any;
        contactPhone: any;
        state: any;
        allowedPlanIds: any;
        enrolledMembers: number;
        activeMembers: number;
        pendingMembers: number;
        createdAt: any;
    }[]>;
    updateSchoolOnboarding(ctx: ResolvedInstitutionContext, tenantId: string, payload: {
        onboardingStatus: string;
        allowedPlanIds?: string[];
        notes?: string;
        rejectionReason?: string;
    }): Promise<any>;
    /**
     * 4. Insurance Plans & Benefits Management
     */
    listPlansAndVersions(ctx: ResolvedInstitutionContext): Promise<any[]>;
    createOrVersionPlan(ctx: ResolvedInstitutionContext, body: any): Promise<{
        plan: any;
        version: any;
    }>;
    updatePlanStatus(ctx: ResolvedInstitutionContext, planId: string, status: 'draft' | 'active' | 'retired'): Promise<any>;
    /**
     * 5. Member & Enrollment Management (Scoped strictly to HMO's plans)
     */
    listEnrollments(ctx: ResolvedInstitutionContext, filters?: {
        status?: string;
        tenantId?: string;
        planId?: string;
        search?: string;
    }): Promise<{
        id: any;
        enrolmentReference: string;
        tenantId: any;
        schoolName: any;
        memberId: any;
        memberCategory: any;
        insurerMemberRef: any;
        cohortLabel: any;
        planId: any;
        planCode: any;
        planName: any;
        planVersion: any;
        premiumMinor: any;
        periodStart: any;
        periodEnd: any;
        status: any;
        providerSyncStatus: any;
        policyNumber: any;
        policyStatus: any;
        createdAt: any;
    }[]>;
    /**
     * Confirms or rejects an individual enrollment by the HMO, recording the external HMO Member ID & Policy.
     */
    adjudicateEnrollment(ctx: ResolvedInstitutionContext, enrolmentId: string, payload: {
        decision: 'confirm' | 'reject' | 'suspend';
        hmoMemberId?: string;
        policyNumber?: string;
        effectiveDate?: string;
        expiryDate?: string;
        reason?: string;
    }): Promise<{
        enrolmentId: string;
        status: string;
        hmoMemberId: string;
        policyNumber: string;
        reason?: undefined;
    } | {
        enrolmentId: string;
        status: string;
        reason: string | undefined;
        hmoMemberId?: undefined;
        policyNumber?: undefined;
    } | {
        enrolmentId: string;
        status: string;
        hmoMemberId?: undefined;
        policyNumber?: undefined;
        reason?: undefined;
    }>;
    /**
     * 6. Excel/CSV Integration Centre: Batch Creation, Export, and Response Reconciliation
     */
    listBatches(ctx: ResolvedInstitutionContext): Promise<any[]>;
    createEnrollmentBatch(ctx: ResolvedInstitutionContext, payload: {
        tenantId?: string;
        planId?: string;
        academicSession?: string;
        coverageStart?: string;
        coverageEnd?: string;
        notes?: string;
    }): Promise<any>;
    exportBatchToCsv(ctx: ResolvedInstitutionContext, batchId: string): Promise<{
        batchId: any;
        batchReference: any;
        filename: string;
        rowCount: number;
        csv: string;
    }>;
    reconcileResponseSheet(ctx: ResolvedInstitutionContext, payload: {
        batchId?: string;
        fileName: string;
        csvContent: string;
        commit?: boolean;
        idempotencyKey?: string;
    }): Promise<{
        mode: string;
        fileName: string;
        checksumSha256: string;
        summary: {
            totalRows: number;
            matchedRows: number;
            confirmedRows: number;
            rejectedRows: number;
            unmatchedRows: number;
            duplicateRows: number;
            invalidRows: number;
            nextBatchStatus: "reconciled" | "awaiting_hmo_response" | "partially_processed";
        };
        results: {
            rowNumber: number;
            enrolmentReference: string;
            batchItemId: string | null;
            enrolmentId: string | null;
            tenantId: string | null;
            memberId: string | null;
            outcome: "matched_confirmed" | "matched_rejected" | "duplicate_ignored" | "unmatched_reference" | "cross_hmo_violation" | "validation_error";
            hmoMemberId: string | null;
            hmoPolicyNumber: string | null;
            confirmedEffectiveDate: string | null;
            confirmedExpiryDate: string | null;
            assignedFacilityRef: string | null;
            rejectionCode: string | null;
            rejectionReason: string | null;
            errorDetails: string | null;
            rawSanitized: Record<string, string>;
        }[];
        job?: undefined;
    } | {
        mode: string;
        job: any;
        fileName: string;
        checksumSha256: string;
        summary: any;
        results: {
            rowNumber: number;
            enrolmentReference: string;
            batchItemId: string | null;
            enrolmentId: string | null;
            tenantId: string | null;
            memberId: string | null;
            outcome: "matched_confirmed" | "matched_rejected" | "duplicate_ignored" | "unmatched_reference" | "cross_hmo_violation" | "validation_error";
            hmoMemberId: string | null;
            hmoPolicyNumber: string | null;
            confirmedEffectiveDate: string | null;
            confirmedExpiryDate: string | null;
            assignedFacilityRef: string | null;
            rejectionCode: string | null;
            rejectionReason: string | null;
            errorDetails: string | null;
            rawSanitized: Record<string, string>;
        }[];
    }>;
    /**
     * 7. Provider Network (Hospitals, Clinics, Pharmacies, Labs)
     */
    listFacilities(ctx: ResolvedInstitutionContext, filters?: {
        state?: string;
        search?: string;
    }): Promise<any[]>;
    saveFacility(ctx: ResolvedInstitutionContext, body: any): Promise<any>;
    /**
     * 8. Pre-Authorization & Claims Management
     */
    listClaimsAndPreAuths(ctx: ResolvedInstitutionContext, filters?: {
        recordType?: 'pre_authorisation' | 'claim';
        status?: string;
    }): Promise<any[]>;
    adjudicateClaimOrPreAuth(ctx: ResolvedInstitutionContext, recordId: string, payload: {
        status: 'approved' | 'rejected' | 'settled';
        authorisedAmountMinor?: number;
        rejectionReason?: string;
    }): Promise<any>;
    /**
     * 9. Billing & Premium Reconciliation + Profit-Sharing Statements Summary
     */
    getBillingSummary(ctx: ResolvedInstitutionContext): Promise<{
        summary: {
            totalInvoices: number;
            totalInvoicedMinor: any;
            totalPaidMinor: any;
            outstandingMinor: number;
            paidInvoicesCount: number;
            pendingInvoicesCount: number;
        };
        invoices: any[];
        statements: any[];
    }>;
    /**
     * 10. HMO Users & Role Management + Searchable Audit Logs
     */
    listUsersAndAudit(ctx: ResolvedInstitutionContext): Promise<{
        currentRole: HmoRole | null;
        availableRoles: HmoRole[];
        rolePermissionsMatrix: Record<HmoRole, import("./institution-classification.service").HmoPermission[]>;
        users: any[];
        recentImportAudit: any[];
    }>;
}
export declare const hmoPortalService: HmoPortalService;
