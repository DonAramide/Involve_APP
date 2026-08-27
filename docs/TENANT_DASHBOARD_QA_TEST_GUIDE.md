# Invify Tenant Web Dashboard QA/QC User Test Guide

This document serves as the master Quality Assurance and Quality Control (QA/QC) user testing guide for the authenticated **Tenant Web Dashboard** (`app.invify.org/tenant/*`). 

> [!IMPORTANT]
> **Scope Limit**: This guide covers the entire authenticated tenant experience starting from the login gateway, portal identity chooser, dynamic industry dashboard resolving (School, Retail, Service), core financial ledger modules, settings configuration, and session security verification.

---

## 1. Environment & Target Routing Setup

Ensure your test agent is pointing to the active deployment:
- **Local Host**: `http://localhost:9000/tenant/login` (Quasar client)
- **Staging Portal**: `https://staging.invify.org/tenant/login`
- **Production Portal**: `https://app.invify.org/tenant/login`

### Verification Scope Matrix
The testing suite is structured into the following categories:
1. **Entrance Gateway & Security Shields (TC-TEN-ENT)**: Login, MFA, Password personalizations, and Lockouts.
2. **Global Dashboard Layout & Shell (TC-TEN-SHL)**: Appbar headers, collapsible sidebars, telemetry ribbon, and profile dropdowns.
3. **Core Operational Matrix (TC-TEN-CORE)**: Overview, ledger, wallet, reconciliation, staff management, and BI reports.
4. **School Mode Sub-Workspace (TC-TEN-SCH)**: Student rosters, fee collections, curriculum tracking, and AI lesson planners.
5. **Retail & Service Mode Sub-Workspace (TC-TEN-RTL)**: Invoicing, POS switches, product catalogs, stock management, and suppliers.
6. **Network & Tenant Isolation Audits (TC-TEN-NET)**: Token isolation, headers injection, and backend CORS validation.

---

## 2. Test Suite Details

### Category A: Entrance Gateway & Security Shields (TC-TEN-ENT)

| Test ID | Test Title | Actions / Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-TEN-ENT-001** | Tenant Portal Login entry | 1. Go to `/tenant/login`. Verify visual split layout.<br>2. Submit empty fields.<br>3. Submit valid email but invalid password format. | • Left pane runs product slider carousel (Retail, Service, School slides).<br>• Renders validator warnings: "Identity matrix cannot be null" and "Passphrase string cannot be absent". | |
| **TC-TEN-ENT-002** | Multi-Factor Authentication (MFA) | 1. Submit valid credentials on tenant login form.<br>2. Verify transition to MFA challenge block.<br>3. Attempt submitting random 4-digit code.<br>4. Submit standard QA mock verification code: `000000` or `123456`. | • Redirects to MFA verifier sub-form: `Mandatory Multi-Factor Gateway Activated`.<br>• Blocks letters/non-6-digit inputs with warning: `Verification format must equal exactly 6 digits`.<br>• Successful mock code redirects user to `/tenant/dashboard`. | |
| **TC-TEN-ENT-003** | First-Time Password Reset Enforcement | 1. Log in with a temporary workspace account configured for initial reset.<br>2. Attempt to bypass using page URLs.<br>3. Verify validator checks for mismatching passphrases. | • Form redirects to: `First Time Sign-In Verification` reset block.<br>• URL routing remains blocked until new passwords are submitted.<br>• Inputs must be >= 6 characters and match exactly. | |
| **TC-TEN-ENT-004** | Device Restriction Fingerprint | 1. Log in from an unauthorized/new device environment.<br>2. Inspect hash fields and clipboard copy buttons. | • Persistent modal `DEVICE ACCESS RESTRICTED` blocks access.<br>• Shows status `PENDING APPROVAL` and copyable hash.<br>• Copy icon copy-to-clipboard function works. | |

---

### Category B: Global Dashboard Layout & Shell (TC-TEN-SHL)

| Test ID | Test Title | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-TEN-SHL-001** | Appbar Branding & Badge Mappings | 1. Navigate to `/tenant/dashboard` post-auth.<br>2. Observe the top header bar brand details. | • Left header shows `INVIFY PORTAL`.<br>• Renders active business name and industry badge (e.g. `SCHOOL` / `RETAIL` / `SERVICE`) based on `tenant_type` storage. |
| **TC-TEN-SHL-002** | Live Telemetry & SLA Tracker | 1. Inspect the right telemetry component on the Appbar header. | • Displays SLA percentage (e.g., `99.98% SLA`).<br>• Displays green flashing live-indicator pulse dot and real-time response latency values. |
| **TC-TEN-SHL-003** | Navigation Sidebar Toggle | 1. Click hamburger `menu` toggle button in header. | • Toggles sidebar collapse: expands to full title width (240px) or collapses to compact mini icon list. |
| **TC-TEN-SHL-004** | Profile dropdown secure options | 1. Click user avatar icon on top right.<br>2. Click "My Profile & Security" link.<br>3. Click "Terminate Session". | • Dropdown displays operator role, email/name, and options.<br>• "My Profile & Security" routes user to `/tenant/profile`.<br>• "Terminate Session" clears token/role keys from LocalStorage and redirects to `/tenant/login`. |
| **TC-TEN-SHL-005** | Dark & Light mode switchers | 1. Inside profile / layout settings, click theme toggle. | • Page colors adapt cleanly without text-contrast drop. Light theme shifts background to `#f1f5f9`, dark theme to `#05070d`. |

---

### Category C: Core Operational Matrix (TC-TEN-CORE)

| Test ID | Test Title | Route | Verification Steps | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-TEN-CORE-001** | Overview Hub Widgets | `/tenant/dashboard` | 1. Open `/tenant/dashboard` with active business type.<br>2. Verify grid items loading states. | • Dynamic widgets render. For `Retail`: Revenue, Wallet, Ledger Feed, and Timeline components. For `School`: Revenue, Attendance, and Ledger components. |
| **TC-TEN-CORE-002** | Transactions Ledger Search | `/tenant/transactions` | 1. Use the filter bar to select Date ranges.<br>2. Search for mock Transaction ID.<br>3. Click "Export CSV". | • Data tables load transaction entries with status badges.<br>• Searching updates record lists. CSV triggers dynamic document export downloads. |
| **TC-TEN-CORE-003** | Wallet & Settlement Accounts | `/tenant/wallet` | 1. Open Wallet. Verify balance metrics.<br>2. Click "Initiate Payout".<br>3. Click "Add Settlement Account". | • Renders Merchant balance cards.<br>• "Initiate Payout" triggers payout validation wizard.<br>• Adding bank checks bank routing numbers against verification services. |
| **TC-TEN-CORE-004** | Reconciliation discrepancies center | `/tenant/reconciliation` | 1. Inspect unmatched ledger items.<br>2. Click "Reconcile" on flagged discrepancy. | • Renders auto-reconciliation discrepancy logs.<br>• Flagged matches allow manual matching adjustments. |
| **TC-TEN-CORE-005** | Staff Governance & RBAC roles | `/tenant/staff` | 1. Navigate to `/tenant/staff`. Click "Invite User".<br>2. Navigate to `/tenant/roles`. Inspect role permissions. | • Invitation wizard triggers user email invite entry.<br>• Permissions checklist allows customizing access levels (e.g. `tenant.wallet.view`). |
| **TC-TEN-CORE-006** | BI Reports Generation | `/tenant/reports` | 1. Click report selector dropdown.<br>2. Select Date range. Click "Generate Report". | • Displays summaries of operations.<br>• Triggers PDF generation wrapper download. |

---

## 3. School Mode Sub-Workspace (TC-TEN-SCH)
> [!NOTE]
> These tests apply only to tenants flagged as `school` / `education` in metadata.

| Test ID | Test Title | Route | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-TEN-SCH-001** | Student Roster & Sync | `/tenant/school-roster` | 1. Open School Roster.<br>2. Click "Sync from Flutter Mobile Sync".<br>3. Click student name. | • Displays grid list of classes, levels, and rostered students.<br>• Sync fetches updated mobile offline rosters via Web Webhook.<br>• Clicking student name opens profile overlay. |
| **TC-TEN-SCH-002** | Tuition Fee Collections | `/tenant/school-payments` | 1. Search by student ID.<br>2. Click "Record Fee Payment". | • Lists invoice records with payment status.<br>• Allows recording checks/deposits or triggering card links. |
| **TC-TEN-SCH-003** | AI Lesson Planner | `/tenant/notes` | 1. Input Grade (e.g., Grade 5), Subject, Topic.<br>2. Click "Generate AI Plan". | • Launches AI request state loader.<br>• Renders structured lesson plans (Objectives, Materials, Steps, Summary). |
| **TC-TEN-SCH-004** | Student Attendance Rolls | `/tenant/attendance` | 1. Select Class/Grade.<br>2. Toggle Present/Absent check-box metrics.<br>3. Click "Submit Roll". | • Renders student lists in a tabular checklist grid.<br>• Submitting roll saves date parameters. |

---

## 4. Retail & Service Mode Sub-Workspace (TC-TEN-RTL)
> [!NOTE]
> These tests apply to tenants flagged as `retail`, `service`, or `hospitality` in metadata.

| Test ID | Test Title | Route | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-TEN-RTL-001** | Stock Inventory Matrix | `/tenant/retail/inventory` | 1. Browse list. Filter by Category.<br>2. Inspect out-of-stock items. | • Displays product SKU grids.<br>• Warns with low-stock flags (< 10 units threshold). |
| **TC-TEN-RTL-002** | Product Catalog Manager | `/tenant/products` | 1. Click "Add Product".<br>2. Enter title, price, stock quantity, SKU.<br>3. Click "Save". | • Launches product form fields card.<br>• Validator flags empty SKU inputs.<br>• Saved items instantly populate product listings. |
| **TC-TEN-RTL-003** | Billing Invoices Wizard | `/tenant/retail/invoices` | 1. Click "Create Invoice".<br>2. Search/add customer profile.<br>3. Add items to list. Click "Issue Invoice". | • Form inputs calculate subtotal, tax percentages, and totals dynamically.<br>• Renders a unique payment link (URL) and QR Code for customer dispatch. |
| **TC-TEN-RTL-004** | Physical POS Terminal Manager | `/tenant/devices` | 1. Navigate to Devices tab.<br>2. Inspect active POS terminal devices.<br>3. Click "Register New Terminal". | • Displays physical terminal models, MAC addresses, status indicator (Online/Offline).<br>• Form requires device registration token code. |

---

## 5. Network Isolation & Security Compliance (TC-TEN-NET)

Ensure the tenant sandbox prevents database cross-contamination and maintains strict isolation.

### Security Inspection Protocol
1. Open browser developer settings (`F12`), navigate to **Network**.
2. Perform operations in the dashboard (e.g. searching transactions, adding product).
3. Inspect request headers.

| Test ID | Security Check | Actions / Steps | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **TC-TEN-NET-001** | Header Tenant Identity Injection | 1. Inspect request headers of any `/api/...` fetch call. | • Every outbound network request must contain header `X-Tenant-ID` matching the active tenant UUID.<br>• Auth requests must inject token `Authorization: Bearer <invify_token>`. |
| **TC-TEN-NET-002** | Token Isolation Boundary | 1. Log in to Tenant A.<br>2. Open console and note localStorage `invify_token`.<br>3. Open new window to login and connect to Tenant B.<br>4. Attempt requesting `/api/v1/tenant/<tenantA_id>/transactions`. | • The request **must fail** with status code `403 Forbidden` (Supabase row-level isolation policies or backend gate controllers reject tenant cross-leakage). |
| **TC-TEN-NET-003** | Local Dev Leakage | 1. Inspect browser requests while navigating dashboard. | • Staging requests must route only to `https://staging.invify.org/api/...` and not leak to localhost API ports (e.g., `3000`). |

---

## 6. Execution Recommendations for QA Testers

1. **Verify Responsive Layout Integrity**: Double-tap and scale viewports. Look for UI overlapping in:
   - Pricing factor grid cards on tablets.
   - The double-column layout of the Contact page's offices list.
2. **Device Activation Mocking**: Work with dev leads to secure a mock Device Registration token when testing terminal links.
3. **MFA Failures Testing**: Always perform "negative testing" by entering incorrect MFA codes or letting the OTP window time out to ensure validation catches these scenarios without page crashes.
