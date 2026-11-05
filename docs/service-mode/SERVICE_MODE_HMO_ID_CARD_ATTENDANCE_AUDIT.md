# Service-mode HMO / ID Card / Attendance — Audit

Status: Phase 1–9 delivered (2026-11-04). See `SERVICE_MODE_HMO_ID_CARD_ATTENDANCE_IMPLEMENTATION_REPORT.md` for wiring, tests, and remaining follow-ups.

## 1. Mode resolution today

### Flutter
| Source | Location | Notes |
|---|---|---|
| `AppSettings.businessMode` | `lib/features/settings/domain/entities/settings.dart` | Default `retail`. Normalised via `normalizedBusinessMode` → `school` / `retail` / `services`. |
| Tenant lock / hydrate | `lib/features/settings/presentation/bloc/settings_bloc.dart` | Mode can be overwritten from tenant profile on sync. |
| Selector UI | `lib/features/settings/presentation/widgets/business_mode_selector.dart` | Retail / School / Services. Locked after activation. |
| Feature gates | `dashboard_page.dart`, stock, school finance | Many `businessMode == 'school'` branches. |

### Web admin
| Source | Location | Notes |
|---|---|---|
| `localStorage.tenant_type` + tenant payload | `invify-admin/src/utils/tenantIndustry.js` | Maps school/education → `school`; service/hospitality → `services`; else retail. |
| Tenant layout hydrate | `layouts/TenantLayout.vue` | Sets `activeIndustry` from `tenant.business_mode \|\| tenant.type`. |
| Partial label use | `IdCardManagementPage.vue`, `EntryExitPage.vue`, `HealthInsuranceDashboardPage.vue` | Already call `tenantIndustry()` for a few strings; most copy remains school-hardcoded. |

**Rule going forward:** terminology must derive from authenticated tenant `business_mode` / Flutter `businessMode`, never from a free-typed frontend override.

## 2. Affected surfaces (hardcoded school terms)

### Mobile (Flutter) — high priority
| Area | Files (representative) | Examples |
|---|---|---|
| ID Card | `id_card_admin_page.dart`, `my_id_card_page.dart`, `school_id_card_preview.dart`, `gate_clock_page.dart` | `Students`, `SCHOOL ID CARD`, `student photo`, Gate clock school copy |
| HMO | `health_wellness_home_page.dart`, health entities/repos | `School Health & Wellness Hub`, `Parent / Guardian`, `Admission Number`, `Class:` |
| Attendance / school roster | `AttendanceManagement*` (if routed), `student_profile_page.dart`, school list/pages | `Student Profile`, `Admission`, class attendance |
| Nav / dashboard | `dashboard_page.dart`, `main.dart` routes | School-only tiles gated by mode (OK) but labels inside school feature still school-only |

### Web (Quasar) — high priority
| Area | Files | Examples |
|---|---|---|
| ID Cards | `pages/school/IdCardManagementPage.vue`, `id-cards/*` | Partial industry awareness; templates still STUDENT-centric |
| Entry/Exit | `pages/school/EntryExitPage.vue` | Partial |
| Attendance | `pages/school/attendance/AttendanceManagementPage.vue` | `Class / Form`, `Admission No`, `Student History`, `Teacher Name` |
| HMO tenant | `domains/tenant/health-insurance/pages/HealthInsuranceDashboardPage.vue` | `Student-Guardian Verification Matrix`, `Admission Number` |
| Nav | `layouts/TenantLayout.vue` | Industry tree exists; child pages still school-labelled |

## 3. Existing helpers
- Flutter: `AppSettings.normalizedBusinessMode`, `isSchoolMode`, `isServicesMode`.
- Web: `tenantIndustry`, `industryLabel`, `industryWorkplace`.
- **New (Phase 2):**
  - Flutter `lib/core/service_mode/service_mode_terms.dart`
  - Web `invify-admin/src/utils/serviceModeTerms.js`

## 4. Proposed terminology (canonical)

| Concept | School | Retail | Service |
|---|---|---|---|
| Primary beneficiary | Student | Customer | Client |
| Beneficiaries | Students | Customers | Clients |
| Beneficiary ID | Admission Number | Customer ID | Client ID |
| Group | Class | Customer Group | Client Group |
| Responsible person | Parent/Guardian | Customer Contact | Client Contact |
| Organisation | School | Business | Business |
| Staff | Teachers/Staff | Employees/Staff | Employees/Staff |
| ID card (beneficiary) | Student ID Card | Customer ID Card | Client ID Card |
| Attendance | Student Attendance | Staff Attendance / Visit Log | Staff Attendance / Service Visit Log |

**Distinctions preserved:** HMO beneficiaries ≠ employees; customer visits ≠ staff clock-in; school entry/exit remains school-oriented semantics even when retitled for retail/service gate clock.

## 5. Backend dependencies
- No API contract changes required for label normalisation.
- Subject types remain `student` / `staff` / `admin` in ID-card and gate APIs.
- Attendance and HMO payloads keep existing field names (`admission_number`, `student_id`, etc.).
- Display layer maps those fields via terminology engine.

## 6. Cross-platform plan
1. Land shared terminology modules (done in Phase 2).
2. Wire ID Card + Gate Clock + Attendance titles/filters (mobile + web).
3. Wire HMO dashboard / wellness hub copy.
4. Sweep remaining dialogs, empty states, exports.
5. Add unit tests for terminology maps + smoke label tests.
6. Implementation report with verification matrix (only tested cells marked Verified).
