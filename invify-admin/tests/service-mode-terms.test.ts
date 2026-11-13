import fs from 'fs'
import path from 'path'
import { serviceModeTerms, resolveServiceMode } from '../src/utils/serviceModeTerms'

describe('serviceModeTerms', () => {
  test('resolves school / retail / service aliases', () => {
    expect(resolveServiceMode('school')).toBe('school')
    expect(resolveServiceMode('education')).toBe('school')
    expect(resolveServiceMode('retail')).toBe('retail')
    expect(resolveServiceMode('order')).toBe('retail')
    expect(resolveServiceMode('service')).toBe('services')
    expect(resolveServiceMode('hospitality')).toBe('services')
  })

  test('school terminology preserves student language', () => {
    const t = serviceModeTerms('school')
    expect(t.beneficiary).toBe('Student')
    expect(t.beneficiaries).toBe('Students')
    expect(t.beneficiaryId).toBe('Admission Number')
    expect(t.beneficiaryGroup).toBe('Class')
    expect(t.responsiblePerson).toBe('Parent / Guardian')
    expect(t.beneficiaryIdCard).toBe('Student ID Card')
    expect(t.gateClockTitle).toBe('Entry and Exit')
    expect(t.hmoVerificationMatrix).toBe('Student-Guardian Verification Matrix')
    expect(t.subjectTypeLabel('student')).toBe('Student')
  })

  test('retail terminology uses customer / employee language', () => {
    const t = serviceModeTerms('retail')
    expect(t.beneficiary).toBe('Customer')
    expect(t.beneficiaries).toBe('Customers')
    expect(t.beneficiaryId).toBe('Customer ID')
    expect(t.beneficiaryGroup).toBe('Customer Group')
    expect(t.staffIdCard).toBe('Employee ID Card')
    expect(t.gateClockTitle).toBe('Gate Clock')
    expect(t.attendanceTitle).toBe('Staff Attendance / Visit Log')
    expect(t.hmoInviteGuardian).toBe('Invite Customer Contact')
    expect(t.subjectTypeLabel('student')).toBe('Customer')
    expect(t.subjectTypeLabel('staff')).toBe('Employee')
  })

  test('service terminology uses client language', () => {
    const t = serviceModeTerms('services')
    expect(t.beneficiary).toBe('Client')
    expect(t.beneficiaries).toBe('Clients')
    expect(t.beneficiaryId).toBe('Client ID')
    expect(t.beneficiaryGroup).toBe('Client Group')
    expect(t.attendanceTitle).toBe('Staff Attendance / Service Visit Log')
    expect(t.hmoHubCaption).toBe('Client health enrolment and coverage')
    expect(t.selectGroup).toBe('Client Group *')
  })

  test('wired screens import the shared resolver', () => {
    const roots = [
      '../src/pages/school/IdCardManagementPage.vue',
      '../src/pages/school/EntryExitPage.vue',
      '../src/pages/school/attendance/AttendanceManagementPage.vue',
      '../src/domains/tenant/health-insurance/pages/HealthInsuranceDashboardPage.vue',
      '../src/layouts/TenantLayout.vue',
    ]
    for (const relative of roots) {
      const source = fs.readFileSync(path.join(__dirname, relative), 'utf8')
      expect(source).toContain('serviceModeTerms')
    }
  })
})
