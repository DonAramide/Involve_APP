# INVIFY HEALTH & WELLNESS — SCHOOL MODE FLUTTER MOBILE IMPLEMENTATION REPORT

**Repository:** `C:\dev\Involve_APP_health`  
**Branch:** `feature/health-insurance-phase1`  
**Report Reference:** `docs/health-insurance/19_SCHOOL_MODE_FLUTTER_IMPLEMENTATION_REPORT.md`  
**Cross-Reference:** `docs/health-insurance/18_HMO_FINANCE_REMEDIATION_REPORT.md`  
**Implementation Standard:** Clean Architecture, BLoC State Management, Material 3, Production-grade Error Handling, Zero-Leakage Privacy Guardrails.  
**Date:** October 19, 2026  
**Status:** `IMPLEMENTED AND VERIFIED` (22/22 Tests Passing)  

---

## 1. Executive Summary

This report documents the end-to-end design, implementation, and verification of the **School Mode Health & Wellness Experience** within the Invify Flutter mobile application (`involve_app`).

The implementation connects the mobile frontend directly to the authenticated backend API namespace (`/api/v1/health-insurance/*`), providing full coverage for four core school stakeholders:
1. **Parent / Guardian Experience:** Transparent management of linked dependants, school plan discovery, enrolment requests, invoice payment tracking, and policy lifecycle status. Features a strict verification barrier: unverified guardian links display a dedicated warning banner and are completely restricted from viewing medical records or policy documents.
2. **Student Experience:** Minimal digital insurance pass presenting essential coverage status, provider name, and emergency hotline. Features strict zero-leakage controls: completely omits financial amounts, invoices, kobo figures, and guardian records.
3. **School Staff Experience:** Dedicated health benefit overview, personal active policy tracking, insurer activation state, and personal claims review.
4. **School Administrator Experience:** Mobile governance dashboard providing school-wide health KPIs (Total Members, Active Policies, Awaiting Verification, Pending Activation, Billed Premiums, Outstanding Balance) and an enrolment review pipeline with sandbox activation simulation.

All 22 unit, BLoC, repository, and widget tests pass with zero failures.

---

## 2. Architecture Discovery & Integration

### 2.1 State Management & Dependency Injection
- **State Management:** Implemented using `flutter_bloc: ^8.1.3` and `equatable: ^2.0.5`.
- **Dependency Hierarchy:** 
  - `HealthInsuranceRepositoryImpl` consumes the existing singleton `FinanceApiClient` (`lib/core/services/finance_api_client.dart`), which injects the authenticated Supabase JWT bearer token via `JwtInterceptor` and the tenant identifier via `TenantInterceptor` (`X-Tenant-ID`).
  - Registered into `AppDependencies` in [`lib/main.dart`](file:///c:/dev/Involve_APP_health/lib/main.dart).
  - Provided down the widget tree via `RepositoryProvider<HealthInsuranceRepository>` and `BlocProvider<HealthInsuranceBloc>`.

### 2.2 Dashboard Navigation & School Mode Routing
- **Menu Catalog:** Added `health_wellness` (`'Health & Wellness'`) to `DashboardMenuCatalog.all` scoped strictly to `modes: ['school']` in [`lib/features/dashboard/domain/dashboard_menu_catalog.dart`](file:///c:/dev/Involve_APP_health/lib/features/dashboard/domain/dashboard_menu_catalog.dart).
- **Dashboard Grid:** Registered tile `_DashboardMenuItem(id: 'health_wellness', title: 'HEALTH & WELLNESS', icon: Icons.health_and_safety, color: Colors.teal)` in [`lib/features/dashboard/presentation/pages/dashboard_page.dart`](file:///c:/dev/Involve_APP_health/lib/features/dashboard/presentation/pages/dashboard_page.dart).
- **Application Routes:** Registered `/health_wellness` (`HealthWellnessHomePage`) and `/health_wellness/claims` (`ClaimsStatusPage`) in `MaterialApp.routes` in [`lib/main.dart`](file:///c:/dev/Involve_APP_health/lib/main.dart).

---

## 3. Implemented Modules & Directory Structure

```
lib/features/health_insurance/
├── domain/
│   ├── entities/
│   │   └── health_insurance_entities.dart
│   └── repositories/
│       └── health_insurance_repository.dart
├── data/
│   └── repositories/
│       └── health_insurance_repository_impl.dart
├── presentation/
│   ├── bloc/
│   │   ├── health_insurance_bloc.dart
│   │   ├── health_insurance_event.dart
│   │   └── health_insurance_state.dart
│   ├── widgets/
│   │   ├── coverage_status_badge.dart
│   │   ├── unverified_warning_banner.dart
│   │   ├── plan_card.dart
│   │   ├── child_coverage_card.dart
│   │   └── claim_card.dart
│   └── pages/
│       ├── health_wellness_home_page.dart
│       ├── plan_details_page.dart
│       ├── enrolment_flow_page.dart
│       ├── policy_details_page.dart
│       └── claims_status_page.dart
```

---

## 4. Role-Specific User Experience & Flows

### 4.1 Parent / Guardian Experience
- **Linked Dependants:** Displays all children linked to the authenticated guardian via `GET /api/v1/health-insurance/guardian/children`.
- **Verification Safeguards:**
  - When link status is `pending_verification` or `rejected`, `UnverifiedWarningBanner` is displayed prominently with amber/red theme.
  - Explains clearly that medical and policy data are restricted until school administration verifies guardianship.
  - Never displays synthetic or fake active insurance.
- **Verified Policy Overview:**
  - Displays HMO provider, plan name, policy number, and coverage period.
  - Displays real-time insurer activation state (`INSURER CONFIRMED` vs `ACTIVATION PENDING`).
  - Provides direct CTA to enrol un-enrolled children into school health plans.
- **Plan Discovery:** Lists available school plan offers with transparent pricing (NGN/year), school subsidy contribution percentage, covered benefits (Inpatient, Outpatient, Emergency, Dental, Optical), and exclusions.

### 4.2 Student Experience (Strict Zero-Leakage)
- **Digital Health Pass:** Displays a mobile ID card containing:
  - HMO Provider name.
  - Student full name and student ID.
  - Policy number.
  - Coverage end date.
  - Status chip (`ACTIVE` vs `PENDING`).
- **Zero Privacy Leakage:** Completely omits invoices, premium amounts, kobo figures, payment receipts, debt balances, and guardian information from the student view.
- **Emergency Helpline:** Lists direct emergency contacts for the campus clinic and sick bay.

### 4.3 School Staff Experience
- **Staff Health Benefits:** Overview of employment health coverage.
- **Active Policy Inspection:** Displays staff member ID, HMO provider, plan name, policy number, and renewal countdown.
- **Claims Tracking:** Direct shortcut to inspect staff personal health claims and pre-authorisations.
- **Staff Plan Selection:** Allows exploring school-approved staff health plans.

### 4.4 School Administrator Experience
- **KPI Metrics:**
  - Total Members.
  - Active Coverage Count.
  - Awaiting Verification Count.
  - Pending Activation Count.
  - Total Billed Premiums (in ₦).
  - Outstanding Premium Balance (in ₦).
- **Enrolment Management:** Real-time list of all school enrolments with quick status chips.
- **Sandbox Testing:** Includes a dedicated "Simulate Insurer Activation (Sandbox)" CTA on policy pages to safely test activation workflows during staging trials without real-money transfers.

---

## 5. Security & Financial Boundary Compliance

1. **Production Flag Guard:** Production activation remains guarded behind `FEATURE_HEALTH_INSURANCE_ENABLED=false`.
2. **Separation of Payment & Coverage:** The mobile client never treats payment confirmation as proof of active insurance. Coverage is rendered as `Active Coverage` ONLY when the backend confirms `hw_policies.status == 'active'` and `hw_enrolments.status == 'active'`. A paid invoice with pending insurer confirmation displays `Awaiting Insurer Activation`.
3. **Backend-Authoritative Logic:** The mobile app does not calculate premiums, compute profit shares, or generate policies locally. All data is fetched from `/api/v1/health-insurance/*`.
4. **No Direct Third-Party HMO Ingress:** The Flutter application communicates exclusively with the Invify backend; no third-party HMO API credentials or endpoints are embedded in client code.
5. **No Local PII / Sensitive Health Storage:** Sensitive medical details, card numbers, and health records are never persisted in unencrypted `SharedPreferences`.

---

## 6. Verification & Automated Test Suite

A comprehensive test suite of 22 automated tests was executed across unit, BLoC, repository, and widget layers.

### Test Results Summary:
```
00:00 +0: HealthInsuranceBloc Tests initial state has correct defaults
00:00 +1: HealthInsuranceBloc Tests LoadHealthInsuranceData populates state with repository data
00:00 +2: HealthInsuranceBloc Tests SwitchHealthUserRole changes currentRole in state
00:00 +3: HealthInsuranceBloc Tests SelectGuardianChild updates selectedChild in state
00:00 +4: HealthInsuranceBloc Tests SubmitEnrolmentRequest handles success cleanly
00:00 +5: HealthInsuranceBloc Tests SimulateSandboxActivationRequest triggers activation and updates metrics
00:00 +6: Health Insurance Entities Unit Tests HealthProvider parses from JSON correctly
00:00 +7: Health Insurance Entities Unit Tests HealthPlan calculates premium in Naira from minor kobo
00:00 +8: Health Insurance Entities Unit Tests TenantPlanOffer parses nested plan version and provider details
00:00 +9: Health Insurance Entities Unit Tests GuardianChild detects verification status accurately
00:00 +10: Health Insurance Entities Unit Tests HealthEnrolment properly reflects active policy vs awaiting activation
00:00 +11: Health Insurance Entities Unit Tests HealthOverviewMetrics parses financial figures and computes coverage percentage
00:01 +12: HealthInsuranceRepositoryImpl Tests repository instantiates successfully
00:01 +13: HealthInsuranceRepositoryImpl Tests getTenantPlanOffers extracts list properly
00:01 +14: HealthInsuranceRepositoryImpl Tests getGuardianChildren extracts children list properly
00:01 +15: Health Insurance Widgets Tests CoverageStatusBadge renders Active Coverage when policy is active
00:02 +16: Health Insurance Widgets Tests CoverageStatusBadge renders Awaiting Insurer Activation when pending
00:02 +17: Health Insurance Widgets Tests CoverageStatusBadge renders Pending School Verification when status is pending_verification
00:02 +18: Health Insurance Widgets Tests UnverifiedWarningBanner displays restriction notice and child name
00:02 +19: Health Insurance Widgets Tests PlanCard displays provider name, plan title and formatted annual premium
00:02 +20: Health Insurance Widgets Tests ChildCoverageCard displays unverified banner message for pending link
00:02 +21: Health Insurance Widgets Tests ClaimCard displays reference, facility, and status label
00:02 +22: All tests passed!
```

---

## 7. Deliverables & Git File Log

### Created Files:
- `lib/features/health_insurance/domain/entities/health_insurance_entities.dart`
- `lib/features/health_insurance/domain/repositories/health_insurance_repository.dart`
- `lib/features/health_insurance/data/repositories/health_insurance_repository_impl.dart`
- `lib/features/health_insurance/presentation/bloc/health_insurance_bloc.dart`
- `lib/features/health_insurance/presentation/bloc/health_insurance_event.dart`
- `lib/features/health_insurance/presentation/bloc/health_insurance_state.dart`
- `lib/features/health_insurance/presentation/widgets/coverage_status_badge.dart`
- `lib/features/health_insurance/presentation/widgets/unverified_warning_banner.dart`
- `lib/features/health_insurance/presentation/widgets/plan_card.dart`
- `lib/features/health_insurance/presentation/widgets/child_coverage_card.dart`
- `lib/features/health_insurance/presentation/widgets/claim_card.dart`
- `lib/features/health_insurance/presentation/pages/health_wellness_home_page.dart`
- `lib/features/health_insurance/presentation/pages/plan_details_page.dart`
- `lib/features/health_insurance/presentation/pages/enrolment_flow_page.dart`
- `lib/features/health_insurance/presentation/pages/policy_details_page.dart`
- `lib/features/health_insurance/presentation/pages/claims_status_page.dart`
- `test/features/health_insurance/health_insurance_entities_test.dart`
- `test/features/health_insurance/health_insurance_bloc_test.dart`
- `test/features/health_insurance/health_insurance_repository_test.dart`
- `test/features/health_insurance/health_insurance_widgets_test.dart`
- `docs/health-insurance/19_SCHOOL_MODE_FLUTTER_IMPLEMENTATION_REPORT.md`

### Modified Files:
- `lib/features/dashboard/domain/dashboard_menu_catalog.dart` (registered `health_wellness` option for school mode)
- `lib/features/dashboard/presentation/pages/dashboard_page.dart` (added tile and navigation to `/health_wellness`)
- `lib/main.dart` (registered `HealthInsuranceRepository`, `HealthInsuranceBloc`, and routes)
- `invify-backend/src/modules/health-insurance/services/health-guardian.service.ts` (enabled returning pending verification links to guardian)

---

## 8. Conclusion

The Invify School Mode Health & Wellness Flutter mobile implementation is fully complete, architecturally sound, thoroughly tested, and ready for staging verification. All strict financial, role-segregation, and data-privacy constraints have been enforced.
