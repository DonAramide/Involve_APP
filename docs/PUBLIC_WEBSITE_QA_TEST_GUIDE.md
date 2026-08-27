# Invify Public Website (invify.org) QA Manual Test Guide

This document serves as the master Quality Assurance (QA) manual testing guide for the public-facing website of **Invify** (`invify.org` / `app.invify.org`). 

> [!IMPORTANT]
> **Scope Limit**: This guide covers *only* the publicly accessible pages, responsive layout grids, navigation interfaces, theme transitions, and the entry-level validation screens of the authentication portals. It explicitly excludes testing the internal authenticated admin, staff, or tenant console dashboards.

---

## 1. Environment & Target Routes Setup

Before executing the test cases, ensure you have targeted the correct URL space:
- **Local Dev Server**: `http://localhost:9000` (Quasar Dev) or `http://localhost:4173` (Vite Preview)
- **Staging URL**: `https://staging.invify.org`
- **Production URL**: `https://invify.org` or `https://app.invify.org`

### Verification Scope Matrix
The testing suite is divided into the following categories:
1. **Global Shell & Responsiveness (TC-GLB)**: Layout, footers, headers, and light/dark theme toggling.
2. **Public Content Pages (TC-PAG)**: Navigating, verifying copy, and verifying calls-to-action (CTAs).
3. **Public Onboarding & Auth Verification (TC-ATH)**: Multi-step forms, field validations, OTP wizards, and error state alerts.
4. **Network & Endpoint Sanitization (TC-NET)**: Browser devtools log verification to ensure endpoint security compliance.

---

## 2. Test Suite Details

### Category A: Global Shell, Navigation & Theming (TC-GLB)

| Test ID | Test Title | Actions / Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-GLB-001** | Navigation Bar Desktop | 1. Open any public page on a desktop viewport (>= 1024px).<br>2. Check for the Invify logo, navigation links, and login button. | • The header is stickied/elevated at the top.<br>• Essential links (Platform, Solutions, Pricing, About, Contact) are visible.<br>• Logo click returns user to home page (`/`). | |
| **TC-GLB-002** | Mobile Navigation Drawer | 1. Reduce viewport width (< 1024px) or toggle responsive mode in inspector.<br>2. Click the hamburger icon (`menu`). | • Desktop menu links hide.<br>• A drawer slides in containing all navigation links in a vertical stack.<br>• Closing button or tapping backdrop dismisses the drawer smoothly. | |
| **TC-GLB-003** | Footer Information and Mappings | 1. Scroll to the absolute bottom of any public page.<br>2. Locate the copyright and meta tags. | • Displays the current calendar year (e.g., `© 2026`).<br>• Footer text says: `Invify Enterprise Platform. All rights reserved.`<br>• Version indicator is shown (e.g., `version 1.0.0`).<br>• Link list contains: Privacy Policy, Terms of Service, Security, Support. | |
| **TC-GLB-004** | Theme Toggling & State Persistence | 1. Locate the floating theme switch icon button (`light_mode` / `dark_mode` icon).<br>2. Click to toggle between light and dark modes.<br>3. Refresh the page.<br>4. Open a new tab to the same URL. | • Theme transition occurs immediately across page sections (backgrounds/text colors adjust to high-contrast specs).<br>• LocalStorage key `invify_public_dark_mode` or `invify_browser_device_id` is updated.<br>• Selected theme state persists upon browser reload and across public routes. | |

---

### Category B: Public Content Pages (TC-PAG)

| Test ID | Test Title | Page / Route | Verification Steps & Interactive Elements | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-PAG-001** | Landing Home Page | `/` | 1. Open `/`. Verify hero background gradient.<br>2. Verify "How Invify helps" cards.<br>3. Inspect the hero visual image carousel. Wait 5-10 seconds.<br>4. Inspect the "Connected hardware" grid section.<br>5. Click "Get Started" and "Explore Platform" CTAs. | • Hero section has a blue background gradient.<br>• Capability list shows exactly 4 cards: Invoice & collect, Track stock, Reconcile money, Control access.<br>• Hero images rotate/cross-fade automatically (5-second intervals).<br>• Showcase displays 4 cards (invify-product-boxes, invify-complete-kit, etc.).<br>• CTAs redirect to `/register` and `/platform` respectively. |
| **TC-PAG-002** | Platform Overview | `/platform` | 1. Navigate to `/platform`.<br>2. Count the platform feature cards. | • Displays 8 functional capability cards (Invoicing, Payments, Finance, Inventory, Reconciliation, Analytics, POS, Staff).<br>• CTAs "Get Started" goes to `/register` and "View Features" goes to `/features`. |
| **TC-PAG-003** | Solutions Verticals | `/solutions` | 1. Navigate to `/solutions`. Check grid elements. | • Shows 4 market cards: Schools (`school`), Retail (`storefront`), Services (`handyman`), Enterprises (`domain`). |
| **TC-PAG-004** | Features Suite | `/features` | 1. Navigate to `/features`. Inspect structural layouts. | • Contains summaries of modular software components.<br>• Links lead back to appropriate signup channels. |
| **TC-PAG-005** | Financial Operations | `/financial-operations` | 1. Navigate to `/financial-operations`. | • Focuses on core bookkeeping, invoicing and ledger features.<br>• Grid layouts must adjust responsively without line overlapping. |
| **TC-PAG-006** | Security | `/security` | 1. Navigate to `/security`. Check for safety markers. | • Details the encryption algorithms used (AES-GCM, TLS 1.3). |
| **TC-PAG-007** | Pricing Matrix | `/pricing` | 1. Navigate to `/pricing`. Inspect pricing cards. | • Displays 4 pricing factor cards: Capabilities, Team Access, Locations, Connected Devices.<br>• Features a premium layout card containing "Get a clear recommendation" heading with a CTA pointing to `/contact`. |
| **TC-PAG-008** | About Us | `/about` | 1. Navigate to `/about`. Check narrative details. | • Details company history, mission, and background. |
| **TC-PAG-009** | Contact Team | `/contact` | 1. Navigate to `/contact`. Inspect phone links.<br>2. Verify physical offices. | • "Call Invify" card contains call links with `tel:+2348023552282` and `tel:+2349027033748`. Tapping on mobile opens dialer.<br>• Displays Lagos office addresses: Owutu Agric, Owode Onirin, and Ikeja. |

---

### Category C: Public Auth Gateways & Form Validation (TC-ATH)
> [!IMPORTANT]
> Do NOT use real passwords or submit credentials that log you into the workspace dashboard. Verify field validators and mock OTP flows.

#### 1. Portal Chooser & Login Layout Validation

| Test ID | Test Title | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-ATH-001** | Portal Chooser Screen | 1. Navigate to `/login`. Check chooser actions.<br>2. Select "Admin / Ops Login" button.<br>3. Go back to chooser and click "Tenant Login". | • Displays two clear paths: Admin / Ops Login (leads to `/admin/login`) and Tenant Login (leads to `/tenant/login`).<br>• Theme switcher works in header. |
| **TC-ATH-002** | Tenant Login Form Fields | 1. Navigate to `/tenant/login`. Verify visual split layout.<br>2. Click login button with empty inputs. | • Screen displays split viewport: left side shows product slider carousel, right side holds form card.<br>• Displays field validation errors: "Identity matrix cannot be null" and "Passphrase string cannot be absent".<br>• Passphrase visibility icon (eye) toggles between plain-text and masked character view. |
| **TC-ATH-003** | Brute Force / Security Lockout UI | 1. Attempt invalid logins multiple times (simulated environment). | • Once threshold limit is breached, login button disables.<br>• An alert banner renders showing a countdown cooldown timer (e.g., `SECURITY ENFORCEMENT: Retry window open in Xs`). |
| **TC-ATH-004** | Device Restriction Fingerprint | 1. Trigger the restricted device flow (simulated via invalid device hash in testing). | • Persistent dialog pops up: `DEVICE ACCESS RESTRICTED`.<br>• Shows email ID, device status as `PENDING APPROVAL`, and copyable device fingerprint hash.<br>• "Copy" button places hash on system clipboard. |
| **TC-ATH-005** | First-Time Password Reset Flow | 1. Trigger first-time sign-in reset (where user must change default credentials). | • Renders alert: `First Time Sign-In Verification`.<br>• Demands new password and confirmation password.<br>• Validates that input is at least 6 characters and matches exactly before submission is allowed. |

#### 2. Registration Wizard (Enterprise Onboarding)

| Test ID | Test Title | Step / Tab | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ATH-006** | Onboarding Step 1: User details | **Step 1** | 1. Go to `/register`. Verify "Back to Home" button.<br>2. Try clicking "Continue" with empty fields.<br>3. Fill "First Name" and "Last Name".<br>4. Fill invalid emails/passwords.<br>5. Fill mismatching password fields. | • "Back to Home" takes user to `/`.<br>• Field validation triggers: First/Last name are required, email and phone are required.<br>• Validation triggers for mismatching passwords ("Passwords do not match"). |
| **TC-ATH-007** | Onboarding Step 2: Email OTP | **Step 2** | 1. Enter details and click "Continue". Verify transition to Step 2.<br>2. Verify OTP input formatting constraint.<br>3. Inspect the "Resend Code" cooldown action. | • Wizard goes to Step 2: "Verify Email".<br>• The OTP input mask accepts exactly 6 numeric digits (typing letters is blocked).<br>• "Resend Code" button is disabled and shows active cooldown timer. |
| **TC-ATH-008** | Onboarding Step 3: WhatsApp OTP | **Step 3** | 1. Submit simulated verified OTP for Step 2.<br>2. Verify WhatsApp OTP layout. | • Wizard goes to Step 3: "Verify WhatsApp".<br>• Displays phone number targeted.<br>• Cooldown rules apply for OTP resending. |
| **TC-ATH-009** | Onboarding Step 4: Success Screen | **Step 4** | 1. Submit simulated verified OTP for Step 3. | • Wizard shows final step: "Account Activated" with green success check circle.<br>• Displays "Go to Dashboard" button pointing to `/dashboard`. |

#### 3. Password Recovery Gateways

| Test ID | Test Title | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TC-ATH-010** | Forgot Password Field Rules | 1. Navigate to `/forgot-password`. Attempt empty submit.<br>2. Type standard email format. Click "Send Code". | • Triggers validator: "Email is required".<br>• Dispatches OTP call. Success banner renders: `Password reset code sent to your email.`<br>• Automatically redirects user to `/reset-password?email=email@address.com`. |
| **TC-ATH-011** | Reset Password OTP Validate | 1. Navigate to `/reset-password` (context active).<br>2. Enter invalid length OTP. | • Title shows: `Validate Recovery Email`.<br>• Accepts only 6-digit numeric input.<br>• On successful mock code validation, steps forward to new password panel. |
| **TC-ATH-012** | Reset Password New Credentials | 1. Verify "Set New Password" panel inputs.<br>2. Fill password < 6 chars.<br>3. Fill matching passwords. Submit. | • Validates that password length is at least 6 characters.<br>• Mismatch validator triggers if passwords differ.<br>• Renders alert: `Password reset successfully. Redirecting to login…` and routes back to `/login`. |

---

## 3. Network Request & Security Inspection (TC-NET)

This section ensures the public site adheres to network security standards, preventing development leakage into the public environment.

### Network Inspection Protocol
1. Open the browser's developer console (`F12`) and select the **Network** tab.
2. Filter the requests by `XHR` or `Fetch`.
3. Browse the public landing pages (`/`, `/platform`, `/solutions`, `/pricing`, `/about`, `/contact`).

| Test ID | Security Check | Actions / Steps | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **TC-NET-001** | Zero Dev Endpoint Leakage | Navigate through public content pages while observing the Network inspector logs. | • **No network requests** are sent to localhost ports (e.g., `http://localhost:3000`), local private IPs, or obsolete hostnames (e.g., `staging-api.invify.local`).<br>• Static assets (images, stylesheets, scripts) are loaded only from the current browser origin. |
| **TC-NET-002** | Staging Safety Isolation | Open console logs on staging environment `https://staging.invify.org`. | • **Zero request failures** due to invalid endpoints.<br>• Any authentication or OTP request is routed strictly to the configured HTTPS origin `https://staging.invify.org/api/...` or targeted staging mock APIs, and not production `api.invify.org`. |

---

## 4. Manual Execution Guidelines for QA Testers

1. **Verify Responsive Layout Integrity**: Double-tap and scale viewports. Look for UI overlapping in:
   - Pricing factor grid cards on tablets.
   - The double-column layout of the Contact page's offices list.
2. **Form Entry Validation Assertions**: Ensure that when forms are submitted with blank values or invalid email formats, the input borders turn red (`negative` state) and explicit helper texts appear immediately.
3. **Mocking Data**: For testing validation steps inside the stepper (such as Steps 2 & 3 of Registration or Password Recovery OTPs), coordinates with the development team should be established to bypass real SMS/Email dispatch networks using predefined sandbox verification keys (e.g., mock OTP code `000000` or `123456`).
