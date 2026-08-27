# Invify Full-Platform QA/QC User Guide

Master click-through script for **every portal, top bar, workspace tab, sidebar item, and in-page sub-tab**. Use this as the runbook; record **Pass / Fail / Blocked** in the Status column. Do not skip a row because a screen looks empty — empty states are still a test.

**Related (deeper negative tests):** [Public](./PUBLIC_WEBSITE_QA_TEST_GUIDE.md) · [Super Admin](./SUPER_ADMIN_PORTAL_QA_TEST_GUIDE.md) · [Tenant](./TENANT_DASHBOARD_QA_TEST_GUIDE.md) · [Mobile](./MOBILE_APP_QA_TEST_GUIDE.md)

---

## 0. How to run this guide

| Item | Value |
| :--- | :--- |
| Environments | Local `http://localhost:9000` · Staging `https://staging.invify.org` · Production `https://app.invify.org` |
| Roles required | Super Admin (`SUPER_ADMIN`), Tenant owner (School + Retail + Service if possible), Field Agent |
| Per check | Open the control → confirm route/title → confirm data or empty state (no crash) → confirm primary action (save/filter/export) if present |
| Fail if | Blank white page, 404/500 toast, wrong tenant data, missing top-bar control, tab does nothing |
| Browser | Desktop ≥1280px **and** one pass at ~390px for public + tenant shells |

**Sign-off block (copy to your run log)**

| Field | Fill in |
| :--- | :--- |
| Tester | |
| Date | |
| Build / URL | |
| Super Admin account | |
| Tenant (school) | |
| Tenant (retail/service) | |
| Agent account | |
| Overall result | Pass / Fail |

---

## Part A — Public website top bar and pages

**Layout:** `PublicLayout` header (desktop) + hamburger drawer (mobile).

### A1. Public top bar / header

| ID | Control | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- |
| PUB-TB-01 | Logo | Click Invify logo | Goes to `/` | |
| PUB-TB-02 | Nav links | Click Home, Platform, Solutions, Financial Operations, Pricing | Each route loads matching page, header stays sticky | |
| PUB-TB-03 | More menu | Open overflow: Features, Security, About, Contact | Each target page loads | |
| PUB-TB-04 | Language | Open language picker; switch locale | Labels change; selection persists on refresh | |
| PUB-TB-05 | Login menu | Open Login: Business Tenant → `/tenant/login`; Super Admin → `/admin/login` | Correct login screens | |
| PUB-TB-06 | Theme | Toggle light/dark (header or drawer) | Contrast remains readable; persists | |
| PUB-TB-07 | Mobile drawer | Viewport &lt; 1024px; open hamburger | Same links as desktop; backdrop/close works | |
| PUB-TB-08 | Footer | Scroll footer: year, version, Privacy/Terms/Security/Support | Year current; links work or show intended page | |

### A2. Public pages (click every route)

| ID | Route | Must verify | Status |
| :--- | :--- | :--- | :--- |
| PUB-PG-01 | `/` | Hero, capability cards, CTAs to `/register` and `/platform`, image rotation | |
| PUB-PG-02 | `/platform` | Feature cards; CTAs `/register`, `/features` | |
| PUB-PG-03 | `/solutions` | School, Retail, Services, Enterprises | |
| PUB-PG-04 | `/features` | Feature copy; signup links | |
| PUB-PG-05 | `/financial-operations` | Finance narrative; no overlap on tablet | |
| PUB-PG-06 | `/security` | Encryption / TLS claims render | |
| PUB-PG-07 | `/pricing` | Pricing cards; contact CTA | |
| PUB-PG-08 | `/about` | Mission/history | |
| PUB-PG-09 | `/contact` | `tel:` numbers; office addresses | |
| PUB-PG-10 | `/login` | Portal chooser: Admin vs Tenant | |
| PUB-PG-11 | `/register` | Multi-step onboarding; empty-field validation | |
| PUB-PG-12 | `/forgot-password` | Email submit + validation | |
| PUB-PG-13 | `/reset-password` | Password + confirm match | |

---

## Part B — Super Admin Command Portal

**Shell:** `MainLayout` · Brand **INVIFY OPS_CORE** · Login `/admin/login`

Use a **SUPER_ADMIN** user so all workspace tabs appear. Lower roles hide some tabs (see §B2).

### B1. Super Admin top bar (left → right)

Test **every** control on the 42px header.

| ID | Control | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-TB-01 | Menu (hamburger) | Click | Sidebar expands/collapses | |
| SAD-TB-02 | INVIFY OPS_CORE | Click brand | Returns toward landing/cockpit (`/`) | |
| SAD-TB-03 | Tenant scope | Open dropdown: Global Master Array, Tenant Alpha, Tenant Omega | Label updates (GLOBAL / TENANT-ALPHA / TENANT-OMEGA); scoped routes prefix tenant when not global | |
| SAD-TB-04 | Workspace tabs | Click each tab in the **center strip** (scroll arrows if needed) | Sidebar menu tree changes immediately; active tab highlighted | |
| SAD-TB-05 | Reorder workspaces | Long-press a workspace tab | Rearrange dialog opens; save order; order persists after refresh | |
| SAD-TB-06 | Command Index | Click “Command Index…” or **Ctrl+K** | Palette opens; typing jumps to a route | |
| SAD-TB-07 | Notifications bell | Click | Drawer opens; badge matches unread count | |
| SAD-TB-08 | Theme | Sun/moon icon | Dark/light swap without unreadable text | |
| SAD-TB-09 | Telemetry ribbon | Observe green/red dot, `eps`, `ms WS` | Connected = green; disconnect network → critical pulse; reconnect recovers | |
| SAD-TB-10 | Context guidance | Sparkle / visibility-off | Overlay guidance on/off | |
| SAD-TB-11 | Incident noise filter | Shield / gpp | Incident mode on (red pulse) / off | |
| SAD-TB-12 | Narrated tour | Explore / pause | Tour starts; pause aborts | |
| SAD-TB-13 | Knowledge drawer | Bookmark icon | Pinned glossary/knowledge drawer toggles | |
| SAD-TB-14 | Profile: View My Profile | Operator dropdown | Profile modal/panel opens | |
| SAD-TB-15 | Pull Cloud Profile Context | Same menu | Preferences refresh from backend (toast or updated prefs) | |
| SAD-TB-16 | Onboarding Testing Flow | Same menu | Navigates to `/onboarding` | |
| SAD-TB-17 | Clear Local Session Trace | Same menu | Session history list clears | |
| SAD-TB-18 | Secure Session Logout | Same menu | Tokens cleared; back at admin login | |
| SAD-TB-19 | Sidebar resize | Drag right edge of drawer | Width ~180–320px; persists | |
| SAD-TB-20 | Pin view | Pin on breadcrumb | Appears under pinned layouts; unpin removes | |
| SAD-TB-21 | Session history | Visit 6 pages | Last ~5 routes listed with time | |
| SAD-TB-22 | Breadcrumb / RBAC | Any deep page | Path shown; RBAC passed (or blocked with clear error) | |

### B2. Workspace tabs (center top bar)

Click **each tab**, then execute the matching sidebar table in §B3.

| Tab ID | Label | Who sees it | Default first sidebar target |
| :--- | :--- | :--- | :--- |
| `fleet` | Fleet Operations | All ops users | `/fleet/overview` |
| `finance` | Finance & Audit | All ops users | `/finance/transactions` |
| `governance` | Governance | Platform staff | `/governance/sessions` |
| `observability` | Observability | All ops users | `/observability/streams` |
| `ai` | AI Operational Intelligence | SUPER_ADMIN, ADMIN_EXECUTIVE | `/ai/copilot` |
| `deployments` | Deployments | SUPER_ADMIN, ADMIN_DEPLOY | `/deployments/rollouts` |
| `apps` | Applications | SUPER_ADMIN, ADMIN_OPS | `/apps/apk-deployment` |
| `incidents` | Incident Response | SUPER_ADMIN, ADMIN_RISK | `/incidents/active` |
| `automation` | Automation & Policy | SUPER_ADMIN, ADMIN_DEPLOY | `/automation/policy` |
| `communications` | Operational Communications | Platform staff | `/communications/broadcast-center` |
| `admin` | Administration | SUPER_ADMIN, ADMIN_DEPLOY | `/admin/settings` |

**Role check (SAD-WS-RBAC):** Log in as a non–super-admin ops role. Confirm hidden tabs do not appear and direct URLs are blocked.

### B3. Sidebar — click every item

For each row: open workspace tab → click item → page title matches → no console crash.

#### Fleet Operations

| ID | Sidebar | Route | Extra checks | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-FLT-01 | Fleet Overview | `/fleet/overview` | Metrics / empty state | |
| SAD-FLT-02 | Device Explorer | `/fleet/devices` (or `/tenant/:id/fleet/devices` when scoped) | Search/filter | |
| SAD-FLT-03 | Terminal Management | `/fleet/terminals` | POS list | |
| SAD-FLT-04 | Device Activation Hub | `/devices` | Activator UI | |
| SAD-FLT-05 | Live Presence Map | `/fleet/presence` | Map or placeholder, no crash | |
| SAD-FLT-06 | Device Groups Array | `/fleet/groups` | | |
| SAD-FLT-07 | Enrollment Pipelines | `/fleet/enrollment` | | |
| SAD-FLT-08 | Fleet Telemetry Grid | `/fleet/telemetry` | | |
| SAD-FLT-09 | Remote Action Controls | `/fleet/actions` | Confirm dual-control if present | |

#### Finance & Audit (sidebar)

| ID | Sidebar | Route | Extra checks | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-FIN-01 | Transactions | `/finance/transactions` | Search, date filter | |
| SAD-FIN-02 | Financial Ledger | `/finance/ledger` | Ledger rows | |
| SAD-FIN-03 | Reconciliation | `/finance/reconciliation` | Match/unmatch UI | |
| SAD-FIN-04 | Settlements | `/finance/settlements` | | |
| SAD-FIN-05 | School Payments | `/finance/school-payments` | **Sub-tabs:** Payments, Disputes; tenant filter if platform | |
| SAD-FIN-06 | Audit Engine | `/finance/audit` | | |

#### Finance deep modules (open via Command Index or URL — still required)

Open each URL. Click **every inner tab** listed.

| ID | Page | Route | Inner tabs / filters to click | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-FIN-07 | Wallet Operations | `/finance/wallets` | Directory vs Risk Investigations; filters Active, Dormant, Suspended, Negative, High Risk, Treasury, Settlement, Merchant, School, Agent. **Detail drawer:** Overview, Balance, Transactions, Ledger, Settlement, Risk, Compliance, Audit, Timeline, Related, Device, Documents, Resolution | |
| SAD-FIN-08 | Card Operations | `/finance/cards` | Directory vs Chargebacks; Active/Blocked/Frozen/Expired/At Risk; Virtual/Physical/Prepaid/Student/Parent/Merchant/Corporate/Treasury. **Drawer:** Overview, Profile, Transactions, Funding, Wallet Sync, Ledger, Settlement, … | |
| SAD-FIN-09 | Terminal Operations | `/finance/terminals` | Open all listed tabs on the page | |
| SAD-FIN-10 | Revenue Operations | `/finance/revenue` | All page tabs | |
| SAD-FIN-11 | Fraud Monitoring | `/finance/fraud` | Investigation vs Correlation; Transaction/Wallet/Card/Terminal/Device/Settlement/ATO/Velocity/Insider/Resolved. **Drawer:** Overview, Risk, Txn, Wallets, Cards, Terminals, Devices, Settlements, Revenue, Evidence, Audit, Timeline, Related, Resolution | |
| SAD-FIN-12 | Tenant Financial Health | `/finance/tenant-health` | Directory vs Portfolio; All/Schools/Retail/Services/Agents/Institutions/High Growth/High Risk/Dormant/Top Revenue/Watchlist. **Drawer:** Overview, Financial Perf, Revenue, Wallets, Cards, Terminals, Settlements, Risk, Compliance, Forecasting, Audit, Timeline, Related, Support History | |
| SAD-FIN-13 | Finance Compliance | `/finance/compliance` | Pipeline vs Watchlists; KYC/AML/Sanctions/PEP/High Value/Suspicious/Violations/Exceptions/Pending/Resolved. **Drawer:** Overview, KYC, AML, Sanctions, PEP, Txn, Risk, Regulatory, Audit, Timeline, Related, Documents, Resolution | |

#### Governance

| ID | Sidebar | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-GOV-01 | Session Governance | `/governance/sessions` | | |
| SAD-GOV-02 | Operator Governance | `/governance/operators` | | |
| SAD-GOV-03 | RBAC Capabilities & Matrix | `/governance/rbac-roles` | | |
| SAD-GOV-04 | Approval Engine | `/governance/approvals` | Queue actions | |
| SAD-GOV-05 | Compliance Audits | `/governance/compliance` | Scoped when tenant selected | |
| SAD-GOV-06 | Audit Trail Ledger | `/governance/audit-trail` | | |
| SAD-GOV-07 | User Device Approvals | `/governance/user-devices` | Approve/deny if test device exists | |
| SAD-GOV-08 | Enterprise Support Desk | `/governance/support` | Tickets list | |
| SAD-GOV-09 | Provisioning Issues | `/governance/provisioning-issues` | | |
| SAD-GOV-10 | Policy Governance | `/governance/policy` | | |
| SAD-GOV-11 | Integrity Center | `/governance/integrity` | Also `/governance/integrity-center` | |
| SAD-GOV-12 | Trust Scoring | `/governance/trust` | | |
| SAD-GOV-13 | Quarantine Center | `/governance/quarantine` | Needs `soc_quarantine` | |
| SAD-GOV-14 | Drift Analysis | `/governance/drift` | | |
| SAD-GOV-15 | Command Center (direct) | `/governance` | Hub page | |
| SAD-GOV-16 | Agent Governance Center | `/governance/agents` | | |
| SAD-GOV-17 | Tenants elevation | `/governance/tenants-elevation` | | |
| SAD-GOV-18 | SLA Command Center | `/governance/sla` | | |

#### Observability

| ID | Sidebar | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-OBS-01 | Live Event Streams | `/observability/streams` | | |
| SAD-OBS-02 | Telemetry Metrics | `/observability/metrics` | | |
| SAD-OBS-03 | Queue Health Maps | `/observability/queues` | | |
| SAD-OBS-04 | WebSocket Diagnostics | `/observability/websocket-health` | | |
| SAD-OBS-05 | Realtime Operations | `/observability/realtime` | Charts load | |
| SAD-OBS-06 | Audit Logs Base | `/observability/audit` | | |
| SAD-OBS-07 | Ingestion Pipelines | `/observability/pipelines` | | |

#### Deployments

| ID | Sidebar | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-DEP-01 | Rollout Control Center | `/deployments/rollouts` | Canary/percentage if present | |
| SAD-DEP-02 | Release Channels | `/deployments/channels` | | |

#### Applications

| ID | Sidebar | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-APP-01 | APK Fleet Deployment | `/apps/apk-deployment` | | |
| SAD-APP-02 | Installed Applications | `/apps/installed` | | |
| SAD-APP-03 | Forbidden Apps | `/apps/forbidden` | | |
| SAD-APP-04 | Accessibility Abuse | `/apps/accessibility` | | |
| SAD-APP-05 | Sideload & Package Lineage | `/apps/sideload` | Also `/apps/sideload` vs `/apps/sideload` integrity page | |

#### Incidents

| ID | Sidebar | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-INC-01 | Active Edge Incidents | `/incidents/active` | Alert count vs UI | |

#### Automation & Policy

| ID | Sidebar | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-AUT-01 | Policy Intelligence Center | `/automation/policy` | | |
| SAD-AUT-02 | Workflow Execution & Audits | `/automation/workflows` | | |

#### AI Operational Intelligence

| ID | Sidebar | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-AI-01 | AI Operational Copilot | `/ai/copilot` | Send a safe query | |
| SAD-AI-02 | AI Lesson Planner | `/notes` | Generate with Grade/Subject/Topic | |
| SAD-AI-03 | Executive Command Center | `/executive` | | |
| SAD-AI-04 | AI Insights Center | `/executive/ai-insights` | | |

#### Operational Communications

| ID | Sidebar | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-COM-01 | Broadcast Center Hub | `/communications/broadcast-center` | Compose/list | |
| SAD-COM-02 | Preflight Previews | `?tab=preflight` | Preview panel | |
| SAD-COM-03 | Lineage Hash Audits | `?tab=audits` | Audit table | |

#### Administration

| ID | Sidebar | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-ADM-01 | Platform Overview | `/admin/settings` | | |
| SAD-ADM-02 | Platform Configuration | `/admin/config` | Do **not** enable maintenance on production without approval | |
| SAD-ADM-03 | Authentication Settings | `/admin/settings/authentication` | | |
| SAD-ADM-04 | Integration Vault | `/admin/vault` | Secrets masked; no plaintext in DOM | |
| SAD-ADM-05 | Tenants Identity Matrix | `/admin/tenants` | Open a tenant detail `/tenants/:id` | |
| SAD-ADM-06 | Operators Access Profiles | `/admin/users` | | |
| SAD-ADM-07 | Tenant Orchestration | `/admin/orchestration` | | |
| SAD-ADM-08 | Agent Governance & Onboarding | `/admin/agents` | | |
| SAD-ADM-09 | Agent Commissions & Billing | `/admin/agents/commissions` | | |
| SAD-ADM-10 | Enterprise Billing & Fees | `/admin/billing` | | |
| SAD-ADM-11 | EMV POS Gateway | `/admin/pos-gateway` | | |
| SAD-ADM-12 | Contact Maintenance | `/admin/contact` | | |
| SAD-ADM-13 | Certifications | `/admin/certifications` | | |
| SAD-ADM-14 | ECS Workspace | `/admin/ecs-workspace` | | |

#### Sandbox / QFS (direct routes — not always a top tab)

| ID | Page | Route | Extra | Status |
| :--- | :--- | :--- | :--- | :--- |
| SAD-SBX-01 | QFS Dashboard | `/sandbox` | | |
| SAD-SBX-02 | Developer Portal | `/sandbox/developer-portal` | | |
| SAD-SBX-03 | API Keys | `/sandbox/keys` | Generate only on staging; key shown once | |

#### Legacy admin routes (still in router — smoke each)

| ID | Route | Status |
| :--- | :--- | :--- |
| SAD-LEG-01 | `/dashboard` | |
| SAD-LEG-02 | `/ledger` `/wallet` `/payments` `/reconciliation` | |
| SAD-LEG-03 | `/curriculum` `/attendance` `/attendance-history` `/billing` `/analytics` `/ai-usage` `/referrals` `/settings` | |

---

## Part C — Tenant portal

**Shell:** `TenantLayout` · Brand **INVIFY PORTAL** · Login `/tenant/login`

Repeat **School**, then **Retail/Service** (and Hotel/Logistics/Clinic if those tenants exist). Sidebar **Core** is always shown; **industry block** changes with `tenant_type`.

### C1. Tenant top bar

| ID | Control | Steps | Expected | Status |
| :--- | :--- | :--- | :--- | :--- |
| TEN-TB-01 | Hamburger | Click | Sidebar 240px ↔ mini | |
| TEN-TB-02 | INVIFY PORTAL | Click | `/tenant/dashboard` | |
| TEN-TB-03 | Business name + industry badge | Observe | Name + SCHOOL / RETAIL / SERVICE (etc.) | |
| TEN-TB-04 | SLA ribbon | Observe | SLA % and latency shown | |
| TEN-TB-05 | Avatar menu: Profile | Click | `/tenant/profile` | |
| TEN-TB-06 | Business Settings | Click | `/tenant/settings` | |
| TEN-TB-07 | Device Activation | Retail/hospitality/healthcare only | `/tenant/devices` | |
| TEN-TB-08 | Terminate Session | Click | Logout → `/tenant/login`; tokens gone | |

### C2. Tenant sidebar — Core (all industries)

| ID | Item | Route | Checks | Status |
| :--- | :--- | :--- | :--- | :--- |
| TEN-CORE-01 | Overview Hub | `/tenant/dashboard` | Widgets for industry | |
| TEN-CORE-02 | Transactions Ledger | `/tenant/transactions` | Filter, search, export if present | |
| TEN-CORE-03 | Wallet & Treasury | `/tenant/wallet` | Balance; payout / settlement account | |
| TEN-CORE-04 | Reconciliation Center | `/tenant/reconciliation` | Discrepancies | |
| TEN-CORE-05 | Staff Management | `/tenant/staff` | Invite | |
| TEN-CORE-06 | BI Reports & Exports | `/tenant/reports` | Generate | |
| TEN-CORE-07 | Portal Preferences | `/tenant/settings` | Save a harmless pref | |
| TEN-CORE-08 | Financial Platform | `/tenant/settings/financial-platform` | Connection/status cards | |
| TEN-CORE-09 | My Profile & Security | `/tenant/profile` | **Sub-tabs:** My Profile, Password & Security, Alert Notifications, Bank Account — click all four; save where safe | |

### C3. Extra tenant routes (open even if not in sidebar)

| ID | Item | Route | Checks | Status |
| :--- | :--- | :--- | :--- | :--- |
| TEN-X-01 | Roles | `/tenant/roles` | Permission matrix | |
| TEN-X-02 | Invitations | `/tenant/invitations` | | |
| TEN-X-03 | Activity Audit | `/tenant/activity` | | |
| TEN-X-04 | CRM Directory | `/tenant/users` | Open `/tenant/users/:id` | |
| TEN-X-05 | Products | `/tenant/products` | Add product (staging) | |
| TEN-X-06 | Categories | `/tenant/categories` | | |
| TEN-X-07 | Stock & Adjustments | `/tenant/stock` | | |
| TEN-X-08 | Suppliers | `/tenant/suppliers` | | |
| TEN-X-09 | Settlements | `/tenant/settlements` | | |
| TEN-X-10 | Payouts | `/tenant/payouts` | | |
| TEN-X-11 | Devices | `/tenant/devices` | | |
| TEN-X-12 | Terminals | `/tenant/terminals` | | |
| TEN-X-13 | Compliance | `/tenant/compliance` | | |
| TEN-X-14 | Audit Logs | `/tenant/audit` | | |
| TEN-X-15 | Analytics | `/tenant/analytics` | | |
| TEN-X-16 | Attendance | `/tenant/attendance` | | |
| TEN-X-17 | Curriculum / Library | `/tenant/curriculum` | | |
| TEN-X-18 | Lesson notes | `/tenant/notes` | AI generate | |
| TEN-X-19 | POS switchboard | `/tenant/retail/pos` | Super-admin only; others 403 | |

### C4. School industry sidebar

| ID | Item | Route / query | Inner tabs | Status |
| :--- | :--- | :--- | :--- | :--- |
| TEN-SCH-01 | Dashboard | `/tenant/analytics` | | |
| TEN-SCH-02 | Admissions | `/tenant/users?pipeline=ADMISSION` | | |
| TEN-SCH-03 | Students | `/tenant/school-roster` | Academics **sub-tabs:** Students, Teachers, Classes, Subjects, Results | |
| TEN-SCH-04 | Guardians | `/tenant/users?type=GUARDIAN` | | |
| TEN-SCH-05 | Academics | `/tenant/school-roster` | Same five sub-tabs | |
| TEN-SCH-06 | School Payments | `/tenant/school-payments` | **Sub-tabs:** Payments, Disputes; Refresh | |
| TEN-SCH-07 | Finance | `/tenant/transactions` | | |
| TEN-SCH-08 | Inventory | `/tenant/retail/inventory` | | |
| TEN-SCH-09 | Library | `/tenant/curriculum` | | |
| TEN-SCH-10 | Transport | `/tenant/logistics/fleet` | | |
| TEN-SCH-11 | Staff | `/tenant/users?role=TEACHER` | | |
| TEN-SCH-12 | Communication | `/tenant/settings` | | |
| TEN-SCH-13 | Reports | `/tenant/analytics` | | |

### C5. Retail industry sidebar

| ID | Item | Route | Status |
| :--- | :--- | :--- | :--- |
| TEN-RTL-01 | Inventory Stock Matrix | `/tenant/retail/inventory` | |
| TEN-RTL-02 | Stock & Adjustments | `/tenant/stock` | |
| TEN-RTL-03 | Customer Lookup | `/tenant/users` | |
| TEN-RTL-04 | Billing Invoices | `/tenant/retail/invoices` | Create invoice (staging) |
| TEN-RTL-05 | Inventory Reports | `/tenant/reports` | |

### C6. Service industry sidebar

| ID | Item | Route | Status |
| :--- | :--- | :--- | :--- |
| TEN-SRV-01 | Service Jobs Ledger | `/tenant/transactions` | |
| TEN-SRV-02 | Customer Directory | `/tenant/users` | |
| TEN-SRV-03 | Billing Invoices | `/tenant/retail/invoices` | |
| TEN-SRV-04 | Performance Analytics | `/tenant/reports` | |

### C7. Other industry sidebars (if tenant type exists)

| ID | Mode | Items / routes | Status |
| :--- | :--- | :--- | :--- |
| TEN-HTL-01 | Hotel | `/tenant/hospitality/rooms`, `/bookings`, `/billing` | |
| TEN-LOG-01 | Logistics | `/tenant/logistics/fleet`, `/dispatch`, `/analytics` | |
| TEN-CLN-01 | Clinic | `/tenant/healthcare/patients`, `/pharmacy`, `/schedule` | |

### C8. Tenant auth gates

| ID | Check | Expected | Status |
| :--- | :--- | :--- | :--- |
| TEN-ENT-01 | Empty login | Validation messages | |
| TEN-ENT-02 | MFA | 6-digit only; wrong code fails | |
| TEN-ENT-03 | First-time password | Cannot skip via URL | |
| TEN-ENT-04 | New device | Pending approval + copy fingerprint | |

---

## Part D — Agent portal

**Layout header:** AGENT PORTAL · agent name / code · logout  
**Login:** `/agent/login` · **Signup:** `/agent/signup`

### D1. Agent top bar

| ID | Control | Expected | Status |
| :--- | :--- | :--- | :--- |
| AGT-TB-01 | AGENT PORTAL brand | Visible | |
| AGT-TB-02 | Name + agent code | Matches logged-in agent | |
| AGT-TB-03 | Logout | Clears `invify_agent_*`; `/agent/login` | |

### D2. Agent dashboard in-page tabs (`AgentDashboardPage`)

On `/agent/dashboard` click **every** tab:

| ID | Tab | Must verify | Status |
| :--- | :--- | :--- | :--- |
| AGT-TAB-01 | Overview | KPIs, quick actions, monthly target | |
| AGT-TAB-02 | Merchants | Merchant list / empty | |
| AGT-TAB-03 | Deployments | Hardware/deployments | |
| AGT-TAB-04 | Finance | Wallet/commission summary; Open Wallet Center | |
| AGT-TAB-05 | Analytics | Open Analytics Center | |
| AGT-TAB-06 | Profile | Open Full Profile / Security | |
| AGT-TAB-07 | Support | Help/support content | |

### D3. Agent routes (sidebar layout + router)

| ID | Route | Page | Inner tabs | Status |
| :--- | :--- | :--- | :--- | :--- |
| AGT-RT-01 | `/agent/login` | Login, forgot password | | |
| AGT-RT-02 | `/agent/signup` | Registration | | |
| AGT-RT-03 | `/agent/success` | Success | | |
| AGT-RT-04 | `/agent/dashboard` | Dashboard (tabs above) | | |
| AGT-RT-05 | `/agent/leads` | Lead kanban | Cards/modals | |
| AGT-RT-06 | `/agent/portfolio` | Tenant portfolio | Register merchant | |
| AGT-RT-07 | `/agent/wallet` | Wallet | Payout if staging | |
| AGT-RT-08 | `/agent/notifications` | Notifications | | |
| AGT-RT-09 | `/agent/profile` | Profile | **Sub-tabs:** Personal Info, KYC Documents, Security & MFA, Identity Card | |
| AGT-RT-10 | `/agent/support` | Support | | |
| AGT-RT-11 | `/agent/kb` | Knowledge base | | |
| AGT-RT-12 | `/agent/training` | Training | | |
| AGT-RT-13 | `/agent/certifications` | Certifications | | |
| AGT-RT-14 | `/agent/reputation` | Reputation | Global vs Regional | |
| AGT-RT-15 | `/agent/analytics` | Analytics | **Sub-tabs:** Performance, Territory, Risk Signals | |
| AGT-RT-16 | `/agent/coming-soon/:module` | Placeholder | Back to dashboard | |

**KYC on profile:** Passport, Government ID, BVN, Proof of Address — each upload control (staging only).

---

## Part E — Mobile app (Flutter)

Run on a device or emulator. School **and** retail profiles if available.

| Area | Pages / features | Status |
| :--- | :--- | :--- |
| Onboarding | Device wizard, activation key, KYC, email/WhatsApp OTP | |
| Hardware | Printer scan, 58/80mm test print, calculator POS, cache audit | |
| School | Roster, profile, fee + receipt print, AI lesson planner, grading bounds | |
| Retail | Invoice cart, checkout, share, stock adjust, expenses/profit | |
| Services | Jobs, technician log, materials, status timeline | |
| Sync | Airplane mode queue → online sync | |
| Isolation | Tenant A data never on Tenant B device | |

Use [MOBILE_APP_QA_TEST_GUIDE.md](./MOBILE_APP_QA_TEST_GUIDE.md) for numbered TC-MOB cases.

---

## Part F — Cross-cutting (every portal)

| ID | Check | Pass if | Status |
| :--- | :--- | :--- | :--- |
| XC-01 | Unauthenticated deep link | Redirects to correct login | |
| XC-02 | 404 | `/this-is-not-a-route` → ErrorNotFound | |
| XC-03 | Tenant isolation | Tenant token cannot load another tenant’s `/api/...` (403) | |
| XC-04 | Admin scope header | After Alpha scope, requests carry tenant scope | |
| XC-05 | Bearer token | Authenticated calls send `Authorization: Bearer` | |
| XC-06 | No secret leak | Vault/API keys not in page source | |
| XC-07 | Console | No repeating uncaught exceptions while clicking the suite | |

---

## Execution order (full day)

1. Public Part A (30 min)  
2. Super Admin B1 top bar (20 min)  
3. Super Admin B2–B3 all workspaces + finance drawers (2–4 h)  
4. Tenant C1–C3 core + extras (1 h)  
5. Tenant C4 school **or** C5 retail (1 h)  
6. Agent D (45 min)  
7. Mobile E if in scope  
8. Part F network (20 min)

**Rule:** If a tab or top-bar icon is not tested, the run is incomplete. Mark Blocked only with a ticket ID.
