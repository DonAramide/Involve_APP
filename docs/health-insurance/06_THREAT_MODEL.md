# Invify Health & Wellness — Threat Model & Security Architecture

**Document:** `docs/health-insurance/06_THREAT_MODEL.md`  
**Phase:** 1 (Design & Architecture)  
**Standard:** STRIDE & Defense-in-Depth Analysis  

---

## 1. Threat Matrix & Mitigations

| Threat ID | Category | Threat Scenario | Impact | Mitigation & Enforcement Level |
|---|---|---|---|---|
| **T1: Tenant Spoofing via Header Injection** | Elevation of Privilege | Attacker sends modified `x-tenant-id` header to read/modify another school's enrolments or staff records. | Critical: Cross-tenant data breach. | **Server-side Resolution**: In the health module, `tenant_id` is NEVER extracted from request headers, query params, or client bodies. It is loaded strictly from the authenticated database user record (`users.tenant_id`) verified by Supabase JWT. |
| **T2: Implicit Super Admin Bypass** | Elevation of Privilege | Platform operator or compromised super admin token inadvertently views sensitive staff/student personal data without business justification. | High: Data privacy violation. | **Explicit Health RBAC**: Health routes bypass standard `checkRole` and employ `requireHealthPermission`. Super admin has zero default access; platform operators require time-boxed grants in `hw_platform_grants` with mandatory audited `reason`. |
| **T3: Client JWT Metadata Manipulation** | Spoofing | User alters `user_metadata.tenantId` or `user_metadata.role` in client context to gain administrative permissions. | Critical: Unauthorized tenant administration. | **Database Claims Lookup**: In production/staging, the health guard loads the user profile directly from PostgreSQL via service-role, discarding unverified `user_metadata` claims. |
| **T4: Child Hijacking / Unauthorized Guardian Access** | Spoofing / Disclosure | Attacker attempts to link to a student's record by guessing admission numbers or UUIDs. | High: Unauthorized disclosure of minor's records. | **Human Verification Gate**: Guardian invitations use 32-byte cryptographically secure random tokens. Acceptance does NOT grant access; link remains `pending_verification` until a school administrator explicitly verifies relationship (`hw_guardian_links.status = 'verified'`). |
| **T5: Client Payment Tampering** | Tampering | User intercepts checkout request to modify premium amount from ₦25,000 to ₦100. | Critical: Financial loss / invalid coverage. | **Server-Side Authoritative Pricing**: The client never passes amount to Quasar. The backend calculates `amount_due_minor` strictly from the immutable `hw_plan_versions` table and invoices it. |
| **T6: Webhook Replay & Forgery** | Tampering / Repudiation | Attacker sends forged provider or Quasar webhooks to activate policies or fake premium payments. | Critical: Unfunded policy activation. | **Constant-Time HMAC & Idempotency**: Webhooks enforce constant-time HMAC-SHA256 verification against stored vault secrets. Duplicate events are discarded via DB uniqueness constraints on `(provider_id, event_id)` and `idempotency_key`. |
| **T7: Fake Policy Activation** | Tampering | Internal bug or bad actor sets enrolment to `active` immediately upon payment without insurer confirmation. | Critical: Breach of insurance regulatory boundary. | **Database Constraint Trigger**: Database trigger `trg_hw_enrolment_active_policy_check` blocks any update of `hw_enrolments.status = 'active'` unless an insurer policy record exists with verified `activation_event_id`. |
| **T8: Medical Data Leakage** | Information Disclosure | Diagnoses, treatment notes, or clinical justifications leak into application logs, error messages, or general audit logs. | High: Violation of Nigerian Data Protection Act (NDPA). | **Data Minimization by Design**: The schema stores zero clinical diagnostic columns. Claims record only external reference codes and status enums. Error handlers scrub payloads before logging. |
| **T9: Ledger Balance Corruption** | Tampering | Health premium collections inadvertently modify tenant business wallet balances or school tuition ledgers. | Critical: Accounting discrepancies. | **Isolated Ledger Account**: Premium collections are credited to dedicated clearing/settlement pass-through accounts. No entries are ever written to `USER_WALLET` or school fee accounts. |

---

## 2. Privacy & Data Protection Safeguards (NDPA Compliance)

1. **Minimisation**: Only attributes strictly necessary to establish policy eligibility (Name, DOB for age bands, Class/Department) are collected.
2. **Consent & Purpose Limitation**: Guardian and employee enrolment requests require clear acknowledgment that records are submitted strictly for insurance underwriting by an authorized HMO/underwriter.
3. **Retention & Disposal**: Data retention periods are configured per-tenant (`retention_months`). Invitations and expired contact values are automatically purged upon link verification or token expiration.
4. **Audit Trail**: Every access, export, verification, or cancellation event generates an immutable record in `hw_audit_events`.
