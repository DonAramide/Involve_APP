/**
 * Central service-mode terminology for HMO, ID Card, and Attendance UX.
 * Mode must come from authenticated tenant config (business_mode / type),
 * not from a free-typed UI preference alone.
 */
import { tenantIndustry } from './tenantIndustry'

/** @typedef {'school'|'retail'|'services'} ServiceMode */

/**
 * @param {string|null|undefined} raw
 * @returns {ServiceMode}
 */
export function resolveServiceMode(raw) {
  return tenantIndustry(raw)
}

/**
 * @param {string|null|undefined} rawMode
 */
export function serviceModeTerms(rawMode) {
  const mode = resolveServiceMode(rawMode)
  const isSchool = mode === 'school'
  const isServices = mode === 'services'

  const beneficiary = isSchool ? 'Student' : isServices ? 'Client' : 'Customer'
  const beneficiaries = isSchool ? 'Students' : isServices ? 'Clients' : 'Customers'
  const staffMember = isSchool ? 'Teacher' : 'Employee'
  const staffMembers = isSchool ? 'Teachers' : 'Employees'
  const organisation = isSchool ? 'School' : 'Business'

  return {
    mode,
    isSchool,
    isRetail: mode === 'retail',
    isServices,
    modeLabel: isSchool ? 'School' : isServices ? 'Service' : 'Retail',
    beneficiary,
    beneficiaries,
    beneficiaryId: isSchool ? 'Admission Number' : isServices ? 'Client ID' : 'Customer ID',
    beneficiaryIdShort: isSchool ? 'Adm No' : isServices ? 'Client ID' : 'Customer ID',
    beneficiaryGroup: isSchool ? 'Class' : isServices ? 'Client Group' : 'Customer Group',
    responsiblePerson: isSchool
      ? 'Parent / Guardian'
      : isServices
        ? 'Client Contact'
        : 'Customer Contact',
    organisation,
    organisationStaff: isSchool ? 'Teachers / Staff' : 'Employees / Staff',
    staffMember,
    staffMembers,
    staffShort: 'Staff',
    administrator: 'Administrator',
    administrators: 'Administrators',
    beneficiaryIdCard: `${beneficiary} ID Card`,
    staffIdCard: isSchool ? 'Staff ID Card' : 'Employee ID Card',
    idCardModuleTitle: 'ID Cards',
    idCardSubtitle: isSchool
      ? 'Student, staff, and administrator cards for this school.'
      : `Staff, administrator, and ${beneficiary.toLowerCase()} cards for this ${organisation.toLowerCase()}.`,
    gateClockTitle: isSchool ? 'Entry and Exit' : 'Gate Clock',
    gateClockBlurb: isSchool
      ? 'School gate arrival and departure sessions for this school.'
      : `Clock-in and clock-out sessions for this ${organisation.toLowerCase()}.`,
    attendanceTitle: isSchool
      ? 'Attendance Management & Reporting'
      : isServices
        ? 'Staff Attendance / Service Visit Log'
        : 'Staff Attendance / Visit Log',
    attendanceHistory: isSchool
      ? 'Attendance History'
      : isServices
        ? 'Attendance / Service History'
        : 'Attendance / Visit History',
    classAttendance: isSchool ? 'Class Attendance Report' : 'Group Attendance Report',
    markAttendance: isSchool ? 'Mark Attendance' : 'Record Attendance',
    activeGroups: isSchool ? 'Active Classes' : 'Active Groups',
    totalBeneficiaries: `Total ${beneficiaries}`,
    selectGroup: isSchool ? 'Class / Form *' : isServices ? 'Client Group *' : 'Customer Group *',
    teacherName: isSchool ? 'Teacher Name' : 'Supervisor Name',
    studentHistory: isSchool ? 'Student History' : `${beneficiary} History`,
    hmoMemberNoun: beneficiaries,
    hmoHubCaption: isSchool
      ? 'School health enrolment and coverage'
      : `${beneficiary} health enrolment and coverage`,
    hmoVerificationMatrix: isSchool
      ? 'Student-Guardian Verification Matrix'
      : `${beneficiary}-Contact Verification Matrix`,
    hmoInviteGuardian: isSchool ? 'Invite Student Guardian' : `Invite ${beneficiary} Contact`,
    hmoMemberLookup: isSchool
      ? 'Member UUID or Admission Number'
      : `Member UUID or ${isServices ? 'Client' : 'Customer'} ID`,
    hmoStudentId: isSchool ? 'Student ID (UUID)' : `${beneficiary} ID (UUID)`,
    subjectTypeLabel(subjectType) {
      const t = String(subjectType || '').toLowerCase()
      if (t === 'student') return beneficiary
      if (t === 'staff') return staffMember
      if (t === 'admin' || t === 'administrator') return 'Administrator'
      return subjectType || ''
    },
  }
}

export default serviceModeTerms
