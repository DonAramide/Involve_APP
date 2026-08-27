# Invify Mobile Application QA/QC User Test Guide

This document serves as the master Quality Assurance and Quality Control (QA/QC) user testing guide for the **Invify Mobile Application** (built with Flutter, running on Android and iOS).

> [!IMPORTANT]
> **Hardware Requirements for Testing**: 
> Mobile testing cycles require a mobile device (or simulated environment) and access to a physical Bluetooth/USB thermal receipt printer (58mm/80mm) to verify checkout receipt prints.

---

## 1. Environment & App Preparation

Before starting the verification scripts:
- **Build Target**: Debug/Staging APK (`build_apk.bat` output) or iOS test build.
- **Local Dev Sandbox**: Ensure the app targets `https://staging.invify.org` (or local staging environment proxy).
- **Offline Mode Prep**: Ensure you know how to toggle Airplane Mode on your testing device to verify SQLite/Hive offline persistence.

### Verification Scope Matrix
The testing suite is structured into the following categories:
1. **Device Onboarding & Activation Security (TC-MOB-ONB)**: Serial registration, KYC upload, and OTP gates.
2. **Hardware Integration & Base utilities (TC-MOB-HW)**: Bluetooth thermal printers pairing and offline DB cache auditing.
3. **School Mode Workspace (TC-MOB-SCH)**: Student list, billing ledger, grading rules, and AI Lesson Planner.
4. **Retail Mode Workspace (TC-MOB-RTL)**: Invoice creator, thermal receipts, inventory catalog, adjustments, and expense logging.
5. **Services Workspace (TC-MOB-SRV)**: Service dashboard, job wizard, technican logs, materials list, and status timeline.
6. **Advanced Offline Sync Resilience (TC-MOB-SYNC)**: Caching queue validations, recovery syncing, and admin overrides.

---

## 2. Test Suite Details

### Category A: Device Onboarding & Activation Security (TC-MOB-ONB)

| Test ID | Test Title | Page Reference | Actions / Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-MOB-ONB-001** | Device Registration Wizard | `device_onboarding_page.dart` | 1. Open app for first time.<br>2. Fill invalid email format on startup. | • Blocks navigation with error message.<br>• Successfully guides user to verification. | |
| **TC-MOB-ONB-002** | Hardware Serial Key Activation | `activation_page.dart` | 1. Enter random strings in "Activation Key" input.<br>2. Enter valid activation token. | • Returns error: `Invalid Device Token Signature`.br>• Success registers unique device serial locally. | |
| **TC-MOB-ONB-003** | KYC Documents Upload | `tenant_kyc_upload_page.dart` | 1. Tap upload file buttons.<br>2. Choose mock image of ID/CAC doc.<br>3. Submit KYC. | • Accesses device camera/gallery with permissions popup.<br>• Shows image thumbnails.<br>• Renders `KYC Submitted - Pending Audit` banner. | |
| **TC-MOB-ONB-004** | Email & WhatsApp OTP | `verify_email_page.dart`<br>`verify_whatsapp_page.dart` | 1. Attempt using mismatch OTP lengths.<br>2. Submit standard OTP key `000000`/`123456`. | • Fields reject letters.<br>• Cool-down button displays timer correctly. | |

---

### Category B: Hardware Integration & Base Utilities (TC-MOB-HW)

| Test ID | Test Title | Page Reference | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-MOB-HW-001** | Bluetooth/USB Printer Search | `printer_settings_page.dart` | 1. Turn on Bluetooth on phone.<br>2. Open Printer Settings, tap "Scan Devices". | • Scanning loader appears.<br>• Found printer MAC addresses are listed. |
| **TC-MOB-HW-002** | Thermal Printer Configuration | `printer_settings_page.dart` | 1. Click target thermal printer in list.<br>2. Toggle width: `58mm` / `80mm`.<br>3. Tap "Print Test Receipt". | • Devices pairs successfully. Status reads `CONNECTED`.<br>• Physical thermal printer prints test page containing Invify logo, timestamp, and test content. |
| **TC-MOB-HW-003** | Calculator POS Utility | `calculator_page.dart` | 1. Open calculator view.<br>2. Enter math sum. Tap "Add to Invoice". | • Functions as POS keypad.<br>• "Add to Invoice" transfers final sum to cart line item automatically. |
| **TC-MOB-HW-004** | Cache Audit Logs | `transaction_audit_page.dart` | 1. View audit logs.<br>2. Compare cached records with server syncing. | • Shows database state (Local vs Server).<br>• Identifies and labels un-synchronized records. |

---

### Category C: School Mode Workspace (TC-MOB-SCH)
> [!NOTE]
> Run these cases when the mobile workspace is synced under a `school` business profile.

| Test ID | Test Title | View Page | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-MOB-SCH-001** | Student Roster & Profile Cards | `student_list_page.dart`<br>`student_profile_page.dart` | 1. Open Student list. Scroll records.<br>2. Search student name.<br>3. Click profile card. | • List scrolls smoothly without stuttering.<br>• Search filters list dynamically.<br>• Profile displays bio info, parents, and fee compliance flags. |
| **TC-MOB-SCH-002** | Fee Collection & Receipt Print | `fee_management_page.dart`<br>`receipt_preview_page.dart` | 1. In student profile, click "Record Fee".<br>2. Input payment amount, method.<br>3. Submit and click "Print Thermal Receipt". | • Prompts payment confirmation.<br>• Displays printable preview.<br>• Triggers paired thermal receipt printout containing matching invoice details. |
| **TC-MOB-SCH-003** | AI Lesson Planner Generator | `generate_lesson_wizard_page.dart` | 1. Select Grade, Subject, Topic.<br>2. Choose AI model from settings.<br>3. Tap "Generate". | • Renders loading spinner.<br>• Renders structured lesson output layout inside a markdown viewer page. |
| **TC-MOB-SCH-004** | Academic Grading & Results | `result_entry_page.dart`<br>`manage_subjects_page.dart` | 1. Select student class.<br>2. Record mock test score (CA) & exam marks.<br>3. Submit. | • Checks boundary thresholds (CA max 30, Exam max 70). Blocks values outside bounds.<br>• Automatically computes grade badge (A, B, C etc.). |

---

### Category D: Retail Mode Workspace (TC-MOB-RTL)
> [!NOTE]
> Run these cases when the mobile workspace is synced under a `retail` business profile.

| Test ID | Test Title | View Page | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-MOB-RTL-001** | POS Invoices Creator Cart | `create_invoice_page.dart` | 1. Add catalog products to cart.<br>2. Adjust item quantity.<br>3. Apply discount percentage slider.<br>4. Select tax code. Click "Checkout". | • Cart badge updates counts dynamically.<br>• Discounts and taxes calculate subtotals correctly.<br>• Checkout screen presents payment methods (Cash, Card, Bank, Transfer). |
| **TC-MOB-RTL-002** | Customer Checkout Log | `invoice_success_page.dart` | 1. Process invoice completion.<br>2. Click "Share Invoice Link". | • Shows invoice summary page.<br>• "Share" triggers Android/iOS native share sheets to copy URL or send via WhatsApp/SMS. |
| **TC-MOB-RTL-003** | Inventory stock count shifts | `stock_management_page.dart`<br>`stock_history_page.dart` | 1. Select item from stock management.<br>2. Tap "Adjust Stock". Enter quantity.<br>3. Submit. Verify stock history list. | • Allows increment or decrement choices.<br>• History logs details (operator, reason: e.g., damage, recount). |
| **TC-MOB-RTL-004** | Expense Logging & Profit margins | `expense_logs_page.dart`<br>`profit_report_page.dart` | 1. Open Expenses, click "Log Expense".<br>2. Choose Category (e.g. rent). Enter cost.<br>3. Check Profit report calculations. | • Captures expense metadata correctly.<br>• Profit report recalculates Net Revenue (Sales Revenue minus recorded Expenses). |

---

### Category E: Services Workspace (TC-MOB-SRV)
> [!NOTE]
> Run these cases when the mobile workspace is synced under a `service` business profile.

| Test ID | Test Title | View Page | Actions / Steps | Expected Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **TC-MOB-SRV-001** | Services Booking Dashboard | `services_dashboard_page.dart` | 1. Inspect dashboard stats cards.<br>2. Tap scheduler calendar layout. | • Shows pending jobs count, active technicians, and today's scheduling slots. |
| **TC-MOB-SRV-002** | Service Job Ticket Creator | `create_job_page.dart` | 1. Select Client.<br>2. Add materials required.<br>3. Set technician hours.<br>4. Submit job. | • Sums material costs and labor estimates based on rates.<br>• Assigns a unique tracking ticket identifier. |
| **TC-MOB-SRV-003** | Job Progress & Stage Shifts | `jobs_list_page.dart`<br>`job_details_page.dart` | 1. Select job ticket.<br>2. Tap "Status" change dropdown.<br>3. Cycle: `Pending` -> `In Progress` -> `Completed`. | • Status shifts change card colors dynamically.<br>• Progress updates timeline entries in logs immediately. |
| **TC-MOB-SRV-004** | Labor Costs & Supplies Catalog | `manage_labor_page.dart`<br>`manage_materials_page.dart` | 1. Adjust hourly technician labor rates.<br>2. Add item to materials catalog. | • Updates pricing multipliers inside job creation page calculations. |

---

## 5. Advanced Offline Sync Resilience (TC-MOB-SYNC)

Verify that the local mobile SQLite database handles disconnection seamlessly.

### Disconnection Verification Script
1. Open the Invify Mobile app. 
2. Trigger **Airplane Mode** on the mobile device (wi-fi and cellular disconnected).
3. Try performing tasks (e.g., recording fee collection or adding product).

| Test ID | Security Check | Actions / Steps | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **TC-MOB-SYNC-001** | Local Database Offline Save | 1. Perform transaction offline.<br>2. Verify success screen. | • The app must **not crash** or show blank screens.<br>• Renders alert banner: `Offline: saved locally`. Saving is redirected to local SQLite/Hive database queue. |
| **TC-MOB-SYNC-002** | Automatic Queue Synchronization | 1. Re-connect phone to active network (Disable Airplane mode).<br>2. Tap sync banner or open dashboard. | • The background sync engine detects network restoration.<br>• Uploads cached offline records queue to staging/production server databases.<br>• Local transaction identifiers match server indexes without duplicates. |
| **TC-MOB-SYNC-003** | Advanced Sandbox Override | 1. Navigate to `/settings/super-admin` (requires toggle verification).<br>2. Tap "Clear Offline Sync Queue". | • Clears/purges local SQLite stores (used for testing database recovery scenarios). |

---

## 6. Mobile UX / Layout Testing Guidelines

1. **Tap Targets**: Ensure all buttons, checkboxes, and textfields have a minimum click-target size of `48 x 48 dp` to comply with touch accessibility guidelines.
2. **Keyboard Focus & Input Avoidance**: Verify that the virtual on-screen keyboard (on Android and iOS) does not overlap or cover up active text inputs (such as OTP inputs or cash entry fields) by ensuring forms utilize scrolling single-child layouts.
3. **Hardware Back Button Handling**: On Android, verify that tapping the hardware back button when inside a wizard flow (like the 4-step Onboarding) shows a warning dialog: `Are you sure you want to cancel?` instead of exiting the app immediately.
