# Invify Super Admin Command Portal QA/QC User Test Guide

This document serves as the master Quality Assurance and Quality Control (QA/QC) user testing guide for the **Invify Super Admin Command Portal** (`app.invify.org/admin/*`).

> [!IMPORTANT]
> **Privileges Constraint**: This guide assumes testing is performed under an account with `SUPER_ADMIN` authorization claims. Certain workspaces (e.g., Deployments, Automation, AI) are hidden or blocked for lower operational role levels (e.g. `STAFF` or `ADMIN_FINANCE`).

---

## 1. Environment & Portal Preparation

Before starting the verification scripts:
- **Environment**: Staging (`https://staging.invify.org`) or Production (`https://app.invify.org`).
- **Required Credentials**: A valid platform operator account with `SUPER_ADMIN` and `ADMIN_DEPLOY` RBAC permission scopes.

### Verification Scope Matrix
The testing suite is structured into the following categories:
1. **Top Command Bar & Universal Controls (TC-SAD-BAR)**: Theme toggles, telemetry readouts, scoping selectors, and command palettes.
2. **Global Sidebar Shell & Session Overview (TC-SAD-SHL)**: Resizable sidebar handles, pinned views, recent history log, and RBAC breadcrumb markers.
3. **Core Operational Workspaces (TC-SAD-CORE)**: Fleet Operations, Governance, Observability, and auxiliary dashboards.
4. **High-Security & Canary Workspaces (TC-SAD-SEC)**: AI Intelligence, Sandbox simulator, Canary Rollouts, and Integration Vault keys.
5. **Network Integrity & WebSocket Heartbeats (TC-SAD-NET)**: Realtime throughput logging, CORS policies, and tenant leakage checks.

---

## 2. Test Suite Details

### Category A: Top Command Bar & Universal Controls (TC-SAD-BAR)

| Test ID | Test Title | Actions / Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-SAD-BAR-001** | Multi-Tenant Scoping Boundary dropdown | 1. Click active tenant scoping tag in top left (e.g., `GLOBAL`).<br>2. Select `Tenant Alpha Scope` or `Tenant Omega Scope`. | • Dropdown opens presenting scopes (Global Master, Alpha, Omega).<br>• Selection updates local scope. Outbound network requests inject the corresponding tenant ID. | |
| **TC-SAD-BAR-002** | Center scrolling Workspace Tabs | 1. Verify the list of workspaces in the center header. Swipe/scroll left-to-right.<br>2. Click a workspace tab (e.g., `Finance & Audit`).<br>3. Long-press/touch-hold a tab. | • Dynamic tabs render for all allowed workspaces based on active permissions.<br>• Clicking a tab updates the active layout and sidebar menu trees immediately.<br>• Long press opens the "Rearrange Workspaces" modal. | |
| **TC-SAD-BAR-003** | Command Index Palette (Ctrl+K) | 1. Click `Command Index...` box or press `Ctrl+K`. | • Renders search overlay prompt.<br>• Typing matches paths, actions, or tools instantly. | |
| **TC-SAD-BAR-004** | Operational Alerts Bell | 1. Tap Notification Bell on top right bar. | • Icon color maps threat level (Green = 0, Amber > 0, Red = Critical).<br>• Clicks open NotificationCenter drawer showing unread system alerts. | |
| **TC-SAD-BAR-005** | Diagnostic Telemetry ribbon | 1. Observe connection stats (`eps` / `ms WS`). | • Displays live web-socket connection state (green dot).<br>• Renders message throughput (Events Per Second) and latency (in milliseconds). | |
| **TC-SAD-BAR-006** | Profile context dropdown options | 1. Click user status node dropdown in header.<br>2. Click "Pull Cloud Profile Context".<br>3. Click "🧪 Onboarding Testing Flow". | • Displays active role name and email.<br>• Pulling preferences fetches updated cloud configs.<br>• Onboarding test launches mock setup workspace. | |

---

### Category B: Global Sidebar Shell & Session Overview (TC-SAD-SHL)

| Test ID | Test Title | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-SAD-SHL-001** | Sidebar Drawer Resizing Handle | 1. Hover mouse over the right border of sidebar drawer.<br>2. Click and drag left/right to resize. | • Cursor shifts to resize indicator (`col-resize`).<br>• Sidebar width resizes smoothly between defined bounds (180px - 320px). |
| **TC-SAD-SHL-002** | Menu Descriptions Tooltips | 1. Hover mouse over sidebar items (e.g., `Immutable Audit Lineage`). | • Renders tooltip dialog detailing the exact menu action and keywords. |
| **TC-SAD-SHL-003** | Layout Pinning / Unpinning | 1. Click "Pin View" button on the breadcrumb route bar.<br>2. Verify view is listed in "Operator Pinned Layouts".<br>3. Click the close "X" next to pinned link to unpin. | • View URL path is added to pinned list.<br>• Unpinning removes view immediately. State persists on refresh. |
| **TC-SAD-SHL-004** | Session History Logging | 1. Click through multiple workspace routes.<br>2. Scroll to "Session History" in sidebar. | • Renders list of up to 5 recently visited pages with timestamps. |
| **TC-SAD-SHL-005** | Explicit Route Breadcrumb bar | 1. Open any sub-route page.<br>2. Observe the path string under top appbar. | • Renders exact relative path URL.<br>• Displays `RBAC Scope Check: Passed` status banner. |

---

### Category C: Core Operational Workspaces (TC-SAD-CORE)

#### 1. Fleet Operations Console (`workspace: 'fleet'`)
- **Overview Dashboard (`/fleet/overview`)**: Displays summary metrics of connected terminals (online percentage, model stats).
- **Device Explorer (`/fleet/devices` / `/tenant/:id/fleet/devices`)**: Search engine for finding physical devices, filtering by tenant ID scopes, and displaying device details.
- **Presence Map & Groups (`/fleet/presence` / `/fleet/groups`)**: Map widgets indicating geographic location of physical POS nodes.
- **Remote Action Triggers (`/fleet/actions`)**: Command switches allowing operators to trigger diagnostic check cycles on remote devices.
- **Tenant Orchestration (`/admin/orchestration`)**: Provisioning new tenant partitions, allocating database tables, and resizing resources.

#### 2. Governance Console (`workspace: 'governance'`)
- **Operator Registry (`/governance/operators`)**: Global dashboard list of platform operators and system staff.
- **Roles & Capabilities (`/governance/rbac-roles`)**: Customizing permissions mapping matrices.
- **Access Elevation Control (`/governance/tenants-elevation`)**: Allows temporary elevation of standard client profiles to diagnostic states.
- **Platform Integrity Center (`/governance/integrity-center`)**: Displays system safety logs, anomalies metrics, and safety compliance levels.
- **SOC Quarantine (`/governance/quarantine`)**: Sandbox area for isolating transactions flagged by fraud algorithms.
- **Approval Engine (`/governance/approvals`)**: Dual-control checklist validation before executing sensitive admin tasks (e.g., key rotation).

#### 3. Observability Workspace (`workspace: 'observability'`)
- **Event Streams (`/observability/streams`)**: Continuous real-time stream logging of server API calls.
- **Websocket Health (`/observability/websocket-health`)**: Interactive dashboard representing socket connection counts and active client listeners.
- **Realtime Dashboard (`/observability/realtime`)**: Charts representing event throughput levels and processing delay times.

#### 4. Finance Workspace (`workspace: 'finance'`)
- **Transaction Investigation (`/finance/transactions`)**: Global system ledger ledger search engine.
- **Global Ledger & Reconciliation (`/finance/ledger` / `/finance/reconciliation`)**: Displays double-entry system logs and auto-reconciliation rules flags.
- **Card & Terminal Ops (`/finance/cards` / `/finance/terminals`)**: Controls for virtual credit card generation parameters and terminal merchant assignments.
- **School Payments disputes (`/finance/school-payments`)**: Cross-platform resolution interface for billing disputes on school tuition feeds.

---

### Category D: High-Security & Auxiliary Workspaces (TC-SAD-SEC)

| Test ID | Test Title | Route / Workspace | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-SAD-SEC-001** | AI Operational Copilot | `/ai/copilot` | 1. Open AI Copilot console.<br>2. Type query about active incidents. | • Launches chat panel interface.<br>• AI generates answers utilizing system logs. |
| **TC-SAD-SEC-002** | Canary Rollouts Controls | `/deployments/rollouts` | 1. Inspect active release rollouts.<br>2. Adjust rollout traffic percentage slider. | • Displays canary progress charts.<br>• System limits sliders based on approval rules. |
| **TC-SAD-SEC-003** | Integration Vault Secrets | `/admin/vault` | 1. Navigate to integration vault.<br>2. Inspect Signing Secrets variables. | • Key values are masked by default (`••••••••`).<br>• Clicking reveal button requires master passcode. |
| **TC-SAD-SEC-004** | Platform lockout config | `/admin/config` | 1. Toggle system maintenance mode checkbox.<br>2. Set custom lockout banner warning copy. | • Saving config activates maintenance mode.<br>• Displays warning banner on public portals. |
| **TC-SAD-SEC-005** | QFS Sandbox keygen | `/sandbox/keys` | 1. Tap "Generate API Key" button.<br>2. Choose scope (read/write). | • Generates unique secret API keys.<br>• Warns user that key is displayed only once. |

---

## 5. Network Request & Security Audits (TC-SAD-NET)

This section ensures the Super Admin portal respects strict isolation boundaries and does not leak telemetry data outside encrypted channels.

### Security Verification Protocol
1. Open browser developer settings (`F12`), select **Network**.
2. Filter requests by `Fetch/XHR`.

| Test ID | Security Check | Actions / Steps | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **TC-SAD-NET-001** | Scoped Request Headers | 1. Change scoping dropdown selection to `Tenant Alpha`.<br>2. Perform search action.<br>3. Inspect request headers. | • Outbound network requests must inject header `X-Tenant-Scope: tenant-alpha`.<br>• Backend database must query only records mapping to the corresponding partition. |
| **TC-SAD-NET-002** | Token Identity Transmission | 1. Verify access tokens on all admin endpoints. | • Every request transmits the authorization token: `Authorization: Bearer <operator_token>`. |
| **TC-SAD-NET-003** | WebSocket Diagnostic Continuity | 1. Disconnect network connections.<br>2. Re-establish connection. | • Telemetry ribbon status shifts to disconnected red state.<br>• Websocket reconnects automatically, restoring stats. |
