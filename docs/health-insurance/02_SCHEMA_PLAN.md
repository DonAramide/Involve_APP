# Invify Health & Wellness — Schema Plan

**Document:** `docs/health-insurance/02_SCHEMA_PLAN.md`  
**Phase:** 1 (Design & Architecture)  
**Status:** PROPOSED — Zero DB mutations executed  

---

## 1. Schema Design Principles

1. **Strictly Additive**: All new tables, functions, indexes, and triggers use the `hw_` namespace. No existing tables (`students`, `users`, `tenants`, `invoices`, `ledgers`, `fee_structures`) are altered.
2. **Defensible Tenant Scoping**: Every tenant-owned record has a foreign key to `public.tenants(id)`. Cross-entity references across differing tenants are strictly blocked via `hw_assert_same_tenant` trigger checks.
3. **Immutability of Historical Terms**: Plan terms are versioned (`hw_plan_versions`). Published versions are immutable, preventing retro-active alteration of policy contracts.
4. **Financial Soundness**: Currency calculations are strictly integer minor units (`bigint` kobo). Zero float/real arithmetic.
5. **No Medical / Diagnostic Data**: Minimalist identity and eligibility attributes only. Claims and authorisations record external references and status codes only.

---

## 2. Entity Relational Architecture

```
                    ┌────────────────────────┐
                    │      hw_providers      │
                    └───────────┬────────────┘
                                │ 1:N
                    ┌───────────▼────────────┐
                    │        hw_plans        │
                    └───────────┬────────────┘
                                │ 1:N
                    ┌───────────▼────────────┐
                    │    hw_plan_versions    │◄────────────────┐
                    └───────────┬────────────┘                 │
                                │ 1:N                          │
                    ┌───────────▼────────────┐                 │
                    │ hw_tenant_plan_offers  │                 │
                    └────────────────────────┘                 │
                                                               │
┌──────────────────┐    ┌────────────────────┐                 │
│ public.students  │    │public.tenant_staff │                 │
└────────┬─────────┘    └─────────┬──────────┘                 │
         │                        │ 1:1                        │
         │                        ▼                            │
         │              ┌────────────────────┐                 │
         │              │ hw_staff_profiles  │                 │
         │              └─────────┬──────────┘                 │
         │                        │                            │
         ▼                        ▼                            │
┌────────────────────────────────────────────┐                 │
│                 hw_members                 │                 │
└─────────────────────┬──────────────────────┘                 │
                      │ 1:N                                    │
                      ▼                                        │
┌────────────────────────────────────────────┐                 │
│                hw_enrolments               │─────────────────┘
└──────────┬───────────────────┬─────────────┘
           │ 1:1               │ 1:N
           ▼                   ▼
┌──────────────────────┐  ┌───────────────────────────┐
│     hw_policies      │  │    hw_premium_invoices    │
└──────────┬───────────┘  └─────────────┬─────────────┘
           │ 1:N                        │ 1:N
           ▼                            ▼
┌──────────────────────┐  ┌───────────────────────────┐
│hw_claim_status_record│  │  hw_payment_allocations   │
└──────────────────────┘  └─────────────▲─────────────┘
                                        │ N:1
                          ┌─────────────┴─────────────┐
                          │        hw_payments        │
                          └───────────────────────────┘
```

---

## 3. Entity Dictionary

| Table Name | Scope | Tenant Ownership Path | Description |
|---|---|---|---|
| `hw_tenant_settings` | Tenant | `tenant_id -> tenants.id` | Feature enablement, mode flags, and data retention rules |
| `hw_permission_grants` | Tenant | `tenant_id -> tenants.id` | Explicit granular permissions per user within a tenant |
| `hw_platform_grants` | Platform | N/A (Platform Admin) | Time-boxed, audited operator grants; no default bypass |
| `hw_providers` | Platform | N/A (Insurer Directory) | Approved insurance partner profiles, adapter keys, vault secret refs |
| `hw_plans` | Platform | N/A (Insurer Directory) | High-level insurance product definitions |
| `hw_plan_versions` | Platform | N/A (Versioned Product) | Immutable policy benefits, rates, frequencies, and eligibility rules |
| `hw_tenant_plan_offers` | Tenant | `tenant_id -> tenants.id` | Selected plans made available by a tenant with funding models |
| `hw_facilities` | Platform | N/A (Partner Directory) | Verified healthcare facility directory provided by insurers |
| `hw_facility_plans` | Platform | N/A | Many-to-many join of facilities and covered plans |
| `hw_staff_profiles` | Tenant | `tenant_id -> tenants.id` | Links `tenant_staff` with `teaching`/`non_teaching` category & user |
| `hw_guardian_links` | Tenant | `tenant_id -> tenants.id` | Verified relationship between student and guardian user identity |
| `hw_guardian_invitations`| Tenant | `tenant_id -> tenants.id` | Secure hashed invitation tokens for parent/guardian onboarding |
| `hw_members` | Tenant | `tenant_id -> tenants.id` | Unified insured member entity mapped to a single source identity |
| `hw_dependants` | Tenant | `tenant_id -> tenants.id` | Eligible dependants of a principal member |
| `hw_enrolments` | Tenant | `tenant_id -> tenants.id` | Policy enrolment lifecycle records for a specific term |
| `hw_policies` | Tenant | `tenant_id -> tenants.id` | Active or expired policy contracts confirmed by the insurer |
| `hw_claim_status_records`| Tenant | `tenant_id -> tenants.id` | Claims and treatment authorisation status metadata |
| `hw_provider_events` | Platform | `provider_id -> hw_providers.id`| Idempotent, cryptographic ingress log of partner webhooks |
| `hw_premium_invoices` | Tenant | `tenant_id -> tenants.id` | Dedicated health insurance invoices (isolated from tuition fees) |
| `hw_payments` | Tenant | `tenant_id -> tenants.id` | Quasar transaction records for premium settlements |
| `hw_payment_allocations`| Tenant | `tenant_id -> tenants.id` | Immutable mapping of payments to premium invoices |
| `hw_audit_events` | Tenant | `tenant_id -> tenants.id` | Append-only security and operational audit trail |

---

## 4. Key Constraints and Guardrails

1. **Foreign Key Integrity**:
   - Deletions on parent entities (`tenants`, `users`, `students`, `hw_members`) use `ON DELETE RESTRICT` on operational tables to prevent accidental cascading data loss.
2. **Tenant Consistency Enforcement**:
   - Due to existing schema variations (`students.tenant_id` being nullable or stored in `school_id`), triggers `trg_hw_*_tenant` intercept every insert/update to verify that referenced foreign records share the exact same tenant.
3. **Immutable History**:
   - Audit logs (`hw_audit_events`) and published plan versions (`hw_plan_versions`) use database triggers (`hw_block_mutation`, `hw_plan_version_immutable`) to reject SQL updates or deletes.
4. **Exclusion and Uniqueness**:
   - Enrolments reject duplicate concurrent active periods for the same member and plan.
   - Payment allocations enforce `UNIQUE (payment_id, invoice_id)` to eliminate double-crediting.
