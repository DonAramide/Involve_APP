# Next version — backlog

## School mode → web sync (phase 2 polish)

**Status:** Started (2026-08-06)  
**Done in this pass:** dashboard-stats from invoices/students; `POST /api/school/bulk-sync` + `GET /api/school/roster`; Flutter Web Sync pushes years/terms/classes/teachers/subjects/students/results; tenant **School Roster** page.

**Still open:**
- Dedicated Fee Management / New Term Bill / Finance Dashboard web UX for school (today: invoices + executive-summary + roster)
- Result Entry / Lesson Notes full sync into graded report UIs
- Apply SQL migration `20260806_fix_dashboard_stats_from_invoices.sql` on staging if RPC is still used elsewhere
- Map CRM `?type=STUDENT` to `students` table (nav now uses `/tenant/school-roster`)

---

## Payment method visibility (super-admin driven)

**Status:** Planned for next version  
**Priority:** Product / platform control

Super admin should be able to enable/disable visibility of selected payment methods on devices, scoped by:

- **Group** — set of tenants (agent / franchise / cohort)
- **Mode** — school, retail, service
- **Tenant** — individual merchant override

### Methods in scope (phase 1)

- Transfer (Personal Company account)
- Pay with Transfer (Virtual Account)
- Customer Wallet / Credit

### Resolution order (most specific wins)

`tenant > group > mode > platform default`

### Notes

- Enforce on device (hide in Invoice Preview) and reject if a disabled method is forced.
- Prefer extending existing runtime / Tenant Orchestration feature-flag path over a new subsystem.
- Suggested rollout: mode toggles → tenant override → groups.
- Cash / POS stay always available unless explicitly gated later.

### Out of scope for this item

- Changing payment settlement logic
- Renaming method values stored on invoices (`Transfer`, `VirtualAccount`, etc.)

---

## INVIFY Workforce Management Enterprise Playbook

**Status:** Planned for next version  
**Priority:** Enterprise / HR & Payroll domain

### Phase overview

```
Phase 1 — Workforce Foundation
        ↓
Phase 2 — Workforce Operations
        ↓
Phase 3 — Payroll & Compensation
        ↓
Phase 4 — Executive Workforce Intelligence
```

---

### PHASE 1 — Workforce Foundation (Prompts 1–8)

#### Prompt 1 — Enterprise Workforce Architecture

**Goal:** Design the complete Workforce domain.

**Deliverables:**
- `implementation_plan.md`
- `workforce_architecture.md`
- `database_model.md`
- `workflow_diagrams.md`

**Stop after architecture.**

#### Prompt 2 — Database & Domain Review

Review existing codebase. Determine:
- Existing users table
- Tenant users
- RBAC
- Departments
- Branches
- Positions

**Rules:** Only extend existing models. Never duplicate.

**Generate:**
- `migration_plan.md`
- `dependency_report.md`

**Stop.**

#### Prompt 3 — Backend Foundation

Implement ONLY:
- Employee Module
- Department Module
- Position Module
- Branch Assignment
- Employee Repository
- DTOs
- Validation

No UI.

**Generate walkthrough. Stop.**

#### Prompt 4 — Frontend Foundation

Implement (read-only):
- Employee List
- Employee Details
- Department Page
- Position Page
- Employee Profile

No payroll. No attendance. **Stop.**

#### Prompt 5 — Architecture Compliance Review

Audit:
- Tenant isolation
- RBAC
- Audit logs
- API design
- DB design

**Generate:** `architecture_compliance.md` — **Stop.**

#### Prompt 6 — Backend Qualification

Run: CRUD tests, RBAC, tenant isolation, API tests.

**Generate:** `qualification_report.md` — **Stop.**

#### Prompt 7 — Frontend Qualification

Validate: UX, accessibility, responsive, performance.

**Generate:** `ui_certification.md` — **Stop.**

#### Prompt 8 — Freeze Phase 1

**Generate:** RC1 Foundation Report — **Freeze.**

---

### PHASE 2 — Workforce Operations (Prompts 9–16)

#### Prompt 9 — Operations Architecture

Design (no code):
- Attendance
- Leave
- Promotion
- Transfer
- Warning
- Performance Review

**Stop.**

#### Prompt 10 — Attendance Engine

Backend only: Clock In, Clock Out, Break, GPS, POS Integration, Audit — **Stop.**

#### Prompt 11 — Leave Engine

Implement: Annual, Sick, Casual, Maternity, Approval workflow — **Stop.**

#### Prompt 12 — Promotion Engine

Workflow: Manager → HR → Admin → Effective Date → Salary Update → RBAC Update → Audit — **Stop.**

#### Prompt 13 — Performance Review

Implement: KPIs, Goals, Reviews, Warnings, Commendations, Training — **Stop.**

#### Prompt 14 — Frontend Operations

Implement: Attendance / Leave / Promotion / Performance dashboards — **Stop.**

#### Prompt 15 — Qualification

Run: Attendance, Promotion, Leave, Transfer, Performance, Audit — **Stop.**

#### Prompt 16 — Freeze Phase 2

**Freeze.**

---

### PHASE 3 — Payroll & Compensation (Prompts 17–25)

#### Prompt 17 — Payroll Architecture

Design (no code): Salary, Allowance, Bonus, Commission, Tax, Pension, NHF, Deductions, Net Pay, Ledger, Quasar.

#### Prompt 18 — Salary Engine

Implement: Salary Grades, Salary Structure, Recurring Components — **Stop.**

#### Prompt 19 — Payroll Processing

Implement: Payroll Run, Approval, Lock, Generate Payslips — **Stop.**

#### Prompt 20 — Ledger Integration

Integrate with existing Ledger:
- Salary Expense DR / Staff Payable CR
- Payment: Staff Payable DR / Bank CR

**Stop.**

#### Prompt 21 — Quasar Salary Payments

Integrate: Batch Payment, Status, Webhook, Retry, Reconciliation — **Stop.**

#### Prompt 22 — Payroll UI

Implement: Payroll Dashboard, Salary History, Payslip Viewer, Approval Screen — **Stop.**

#### Prompt 23 — Qualification

Validate: Payroll, Ledger, Accounting, Batch Payments, Audit — **Stop.**

#### Prompt 24 — Architecture Audit

Independent review — **Stop.**

#### Prompt 25 — Freeze Payroll

**Freeze.**

---

### PHASE 4 — Executive Workforce Intelligence (Prompts 26–33)

#### Prompt 26 — Analytics Architecture

Design (no code): Workforce KPIs, Headcount, Department Cost, Payroll Trends, Attendance Trends, Productivity.

#### Prompt 27 — Workforce Dashboard

Implement: Employees, Present, Absent, Leave, Payroll, Open Approvals, Turnover — **Stop.**

#### Prompt 28 — Recruitment

Implement: Applicants → Interview → Offer → Hire → Employee — **Stop.**

#### Prompt 29 — Employee Documents

Implement: Contracts, Certificates, IDs, Promotion Letters, Payslips, Secure storage — **Stop.**

#### Prompt 30 — Executive Reports

Generate: PDF, Excel, Charts, Department Costs, Salary Trends, Performance — **Stop.**

#### Prompt 31 — Full Business Journey Qualification

Validate end-to-end:
Hire Employee → Attendance → Promotion → Payroll → Quasar Payment → Ledger → Audit → Analytics — **Stop.**

#### Prompt 32 — Enterprise Certification

Independent QA. Generate: Evidence Pack, Architecture Report, Business Journey Report, Operational Qualification — **Stop.**

#### Prompt 33 — GA Freeze

Generate: RC1 Workforce Certification, Release Checklist, Known Limitations, Executive Sign-Off — **Freeze.**

---

### Final Workforce Business Journey

The module should ultimately support this complete lifecycle:

```
Recruit Employee
        │
        ▼
Employee Profile Created
        │
        ▼
Assign Department & Position
        │
        ▼
Assign Branch
        │
        ▼
Grant RBAC Permissions
        │
        ▼
Clock In / Attendance
        │
        ▼
Leave / Performance / Promotion
        │
        ▼
Payroll Calculation
        │
        ▼
Admin Approval
        │
        ▼
Quasar Batch Salary Payment
        │
        ▼
Double-Entry Ledger Posting
        │
        ▼
Payslip Generation
        │
        ▼
Employee Notification
        │
        ▼
Analytics & Executive Reporting
```
