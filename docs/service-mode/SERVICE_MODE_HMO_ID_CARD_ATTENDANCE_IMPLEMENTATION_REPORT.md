# Service-mode HMO / ID Card / Attendance — Implementation Report

Date: 2026-11-04  
Scope: Label and UX normalisation for School / Retail / Service across Flutter mobile and Invify Admin web.  
No production deploy. No destructive migrations. No HMO finance / activation rule changes.

---

## Shared terminology resolver

| Platform | Path | Source of truth |
|---|---|---|
| Flutter | `lib/core/service_mode/service_mode_terms.dart` | `AppSettings.normalizedBusinessMode` via `SettingsBloc` |
| Web | `invify-admin/src/utils/serviceModeTerms.js` | `tenantIndustry()` ← tenant `business_mode` / `type` from auth hydrate |

Both map aliases (`education`→school, `service`/`hospitality`→services, else retail) and expose the same concept keys (beneficiary, group, ID, attendance titles, HMO captions, subject-type display labels). API subject types remain `student` / `staff` / `admin`.

---

## Mode-specific terminology (implemented)

| Concept | School | Retail | Service |
|---|---|---|---|
| Primary beneficiary | Student | Customer | Client |
| Beneficiaries | Students | Customers | Clients |
| Beneficiary ID | Admission Number | Customer ID | Client ID |
| Group | Class | Customer Group | Client Group |
| Responsible person | Parent / Guardian | Customer Contact | Client Contact |
| Organisation | School | Business | Business |
| Staff ID card | Staff ID Card | Employee ID Card | Employee ID Card |
| Attendance title | Student Attendance / Attendance Management | Staff Attendance / Visit Log | Staff Attendance / Service Visit Log |
| Gate | Entry and Exit / Gate clock | Gate Clock / Attendance clock | Gate Clock / Attendance clock |
| HMO hub | School Health & Wellness Hub | Customer Health & Wellness Hub | Client Health & Wellness Hub |

---

## Files changed

### Phase 1–2
- `docs/service-mode/SERVICE_MODE_HMO_ID_CARD_ATTENDANCE_AUDIT.md` (audit)
- `lib/core/service_mode/service_mode_terms.dart` (engine)
- `invify-admin/src/utils/serviceModeTerms.js` (engine)

### Mobile (Flutter)
- `lib/features/school/presentation/pages/id_card_admin_page.dart` — filters, print hint, thermal print banners/return/signatory, preview terms
- `lib/features/school/presentation/pages/my_id_card_page.dart` — org fallback, preview terms, copy
- `lib/features/school/presentation/widgets/school_id_card_preview.dart` — group field, return hint, signatory
- `lib/features/school/presentation/pages/gate_clock_page.dart` — app bar title
- `lib/features/school/presentation/pages/attendance_dashboard_page.dart` — titles, tabs, empty states, group picker, correction dialog
- `lib/features/health_insurance/presentation/pages/health_wellness_home_page.dart` — hub title, roles, plans, enrol CTA, student pass

### Web (Quasar)
- `invify-admin/src/pages/school/IdCardManagementPage.vue` — subtitle, category chips, template labels, publish copy
- `invify-admin/src/pages/school/EntryExitPage.vue` — title/caption via terms
- `invify-admin/src/pages/school/attendance/AttendanceManagementPage.vue` — tabs, metrics, selectors, enrol dialog, reports
- `invify-admin/src/domains/tenant/health-insurance/pages/HealthInsuranceDashboardPage.vue` — member noun, verification matrix, invite/lookup labels
- `invify-admin/src/layouts/TenantLayout.vue` — identity nav (HMO, ID Cards, Gate, Attendance) mode-aware; retail/service get Attendance entry

### Tests
- `test/core/service_mode_terms_test.dart`
- `invify-admin/tests/service-mode-terms.test.ts`
- `invify-admin/tests/tenant-industry.test.ts` (updated for `identityNav(..., terms)`)

---

## API / database changes

None. Display-layer only. QR / Code 128 payloads, subject IDs, admission_number fields, and attendance / HMO schemas unchanged.

---

## Automated test results

| Suite | Result |
|---|---|
| `flutter test test/core/service_mode_terms_test.dart` | **Passed** (6 tests) |
| `jest tests/service-mode-terms.test.ts` | **Passed** |
| `jest tests/tenant-industry.test.ts` | **Passed** |

Full regression suite (HMO provider, school gate, APK build, admin production build) was **not** re-run in this session.

---

## Remaining inconsistencies / follow-ups

1. **Student profile / school finance** pages still use school nouns; they are school-gated workflows. Retail/Service tenants typically do not open them, but a full sweep of every `Student` string outside HMO/ID/Attendance remains optional.
2. **Attendance empty-state icons** still use `Icons.school_outlined` on mobile (visual only).
3. **Web ID card template faces** may still show sample “Class” metadata inside template gallery assets until template sampleFace helpers are mode-parameterised.
4. **HMO enrolment_flow / plan_details / claims** secondary Flutter pages may retain isolated school strings; hub and role chrome are normalised.
5. **End-to-end UI** for Retail and Service tenants was not exercised in a live browser/device in this pass — only unit + source wiring checks.

---

## Deployment requirements

- Ship Flutter app build that includes `service_mode_terms.dart` and wired pages.
- Ship `invify-admin` dist with `serviceModeTerms.js` and updated Vue pages/layout.
- No DB migration. No env change. Tenant `business_mode` must already be set correctly on the tenant record (existing requirement).

---

## Verification matrix

Only cells with automated or source-level verification in this session are marked Verified. Live multi-mode UI walkthroughs remain pending.

| Feature | School | Retail | Service | Mobile | Web |
|---|---|---|---|---|---|
| HMO | Terms unit Verified | Terms unit Verified | Terms unit Verified | Hub wired | Dashboard + nav wired |
| ID Cards | Terms unit Verified | Terms unit Verified | Terms unit Verified | Admin/My/Preview/print wired | Management + nav wired |
| Attendance | Terms unit Verified | Terms unit Verified | Terms unit Verified | Dashboard wired | Management + nav wired |

Legend: **Terms unit Verified** = resolver returns expected nouns for that mode. **Wired** = screens consume the shared resolver (confirmed by code + Jest source checks). Not claimed as full interactive QA.
