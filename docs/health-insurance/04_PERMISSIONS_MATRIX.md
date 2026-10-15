# Invify Health & Wellness — Role & Permission Matrix

**Document:** `docs/health-insurance/04_PERMISSIONS_MATRIX.md`  
**Phase:** 1 (Design & Architecture)  

---

## 1. Principles of Least Privilege & Isolation

1. **No Implicit Super Admin Bypass**: The legacy `checkRole` bypass for `super_admin` is explicitly disabled in the Health module. Platform operators must be granted explicit, audited, time-boxed permissions in `hw_platform_grants`.
2. **HR / Employment Category Separation**: An employee possessing `tenant_staff` role or `teaching` category has zero administrative rights over other staff members. Only users holding `health.hr_admin` can manage staff health profiles.
3. **Finance & Medical Isolation**: Finance users (`health.billing.*`) can generate invoices, review payment settlements, and trigger ledger reconciliation, but have zero access to student documents, dependant records, or treatment authorisations.
4. **Guardian Context**: Guardians hold zero tenant-level listing permissions. Their access is strictly evaluated on an object-level basis through verified `hw_guardian_links` rows.

---

## 2. Granular Permissions Defined

| Permission Code | Domain | Description |
|---|---|---|
| `health.settings.manage` | Tenant Config | Enable/disable health modes, configure default notifications and retention |
| `health.plans.manage` | Plans & Pricing | Select available plan versions for the tenant and configure funding splits |
| `health.members.read` | Members | Read tenant members list and filter by class/cohort |
| `health.members.manage` | Members | Create, update, or import members (students, staff, dependants) |
| `health.students.access` | Student Scope | Access student-linked health records (requires school mode) |
| `health.staff.access` | Staff Scope | View personal staff health coverage and personal dependants |
| `health.hr_admin` | HR Scope | Manage staff health profiles, employment categories, and staff enrolments |
| `health.enrolments.manage`| Enrolments | Initiate enrolments, submit documents, submit renewals |
| `health.enrolments.verify`| Enrolments | Review eligibility, approve/reject enrolment verification |
| `health.guardians.manage` | Guardians | Send invitations, verify guardian relationships, configure permissions |
| `health.billing.read` | Financial | View premium invoices, payment history, and reconciliation logs |
| `health.billing.manage` | Financial | Issue premium invoices, allocate payments, initiate refund requests |
| `health.reports.read` | Analytics | View dashboard summary cards, coverage trends, and financial reports |
| `health.exports.run` | Data Export | Generate and download CSV/Excel data exports (audited) |
| `health.audit.read` | Audit | Inspect the immutable append-only health audit trail |
| `health.claims.read` | Claims | View partner treatment authorisations and claim status codes |

---

## 3. Role-to-Permission Mapping Matrix

| Permission | School Admin (`owner`/`admin`) | Finance / Bursar (`finance_staff`) | HR Administrator (`health.hr_admin`) | Teaching / Non-Teaching Staff | Parent / Guardian | Platform Operator (Audited) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `health.settings.manage` | **YES** | NO | NO | NO | NO | WITH GRANT |
| `health.plans.manage` | **YES** | NO | NO | NO | NO | WITH GRANT |
| `health.members.read` | **YES** | NO | **YES** | NO | NO | WITH GRANT |
| `health.members.manage` | **YES** | NO | **YES** (Staff only)| NO | NO | WITH GRANT |
| `health.students.access` | **YES** | NO | NO | NO | LINKED ONLY | WITH GRANT |
| `health.staff.access` | **YES** | NO | **YES** | SELF ONLY | NO | WITH GRANT |
| `health.hr_admin` | **NO** (Must be granted) | NO | **YES** | NO | NO | WITH GRANT |
| `health.enrolments.manage`| **YES** | NO | **YES** | SELF ONLY | LINKED ONLY | WITH GRANT |
| `health.enrolments.verify`| **YES** | NO | NO | NO | NO | WITH GRANT |
| `health.guardians.manage` | **YES** | NO | NO | NO | NO | WITH GRANT |
| `health.billing.read` | **YES** | **YES** | NO | NO | LINKED ONLY | WITH GRANT |
| `health.billing.manage` | **YES** | **YES** | NO | NO | LINKED ONLY (Pay) | WITH GRANT |
| `health.reports.read` | **YES** | **YES** (Financial) | NO | NO | NO | WITH GRANT |
| `health.exports.run` | **YES** | **YES** (Financial) | NO | NO | NO | WITH GRANT |
| `health.audit.read` | **YES** | NO | NO | NO | NO | WITH GRANT |
| `health.claims.read` | **YES** | NO | NO | SELF ONLY | LINKED ONLY | WITH GRANT |
