/// Central service-mode terminology for HMO, ID Card, and Attendance UX.
///
/// Mode is resolved from the authenticated tenant's [businessMode] /
/// [AppSettings.normalizedBusinessMode] — never from a free-typed UI toggle alone.
library;

enum ServiceMode { school, retail, services }

ServiceMode resolveServiceMode(String? raw) {
  final mode = (raw ?? '')
      .toLowerCase()
      .trim()
      .replaceAll(RegExp(r'[\s-]+'), '_');
  if (mode == 'school' || mode == 'education' || mode == 'invify_school') {
    return ServiceMode.school;
  }
  if (mode == 'service' ||
      mode == 'services' ||
      mode == 'hospitality' ||
      mode == 'invify_services') {
    return ServiceMode.services;
  }
  return ServiceMode.retail;
}

/// Shared nouns / phrases keyed by concept. Prefer [ServiceModeTerms.fromRaw].
class ServiceModeTerms {
  final ServiceMode mode;

  const ServiceModeTerms(this.mode);

  factory ServiceModeTerms.fromRaw(String? raw) =>
      ServiceModeTerms(resolveServiceMode(raw));

  bool get isSchool => mode == ServiceMode.school;
  bool get isRetail => mode == ServiceMode.retail;
  bool get isServices => mode == ServiceMode.services;

  String get modeLabel {
    switch (mode) {
      case ServiceMode.school:
        return 'School';
      case ServiceMode.retail:
        return 'Retail';
      case ServiceMode.services:
        return 'Service';
    }
  }

  /// Primary beneficiary of HMO / ID card / visit flows (not employees).
  String get beneficiary => isSchool
      ? 'Student'
      : isServices
          ? 'Client'
          : 'Customer';

  String get beneficiaries => isSchool
      ? 'Students'
      : isServices
          ? 'Clients'
          : 'Customers';

  String get beneficiaryId => isSchool
      ? 'Admission Number'
      : isServices
          ? 'Client ID'
          : 'Customer ID';

  String get beneficiaryIdShort => isSchool
      ? 'Adm No'
      : isServices
          ? 'Client ID'
          : 'Customer ID';

  String get beneficiaryGroup => isSchool
      ? 'Class'
      : isServices
          ? 'Client Group'
          : 'Customer Group';

  String get responsiblePerson => isSchool
      ? 'Parent / Guardian'
      : isServices
          ? 'Client Contact'
          : 'Customer Contact';

  String get organisation => isSchool ? 'School' : 'Business';

  String get organisationStaff => isSchool ? 'Teachers / Staff' : 'Employees / Staff';

  String get staffMember => isSchool ? 'Teacher' : 'Employee';

  String get staffMembers => isSchool ? 'Teachers' : 'Employees';

  String get staffShort => 'Staff';

  String get administrator => 'Administrator';

  String get administrators => 'Administrators';

  /// ID card product name for the primary beneficiary type.
  String get beneficiaryIdCard => '$beneficiary ID Card';

  String get staffIdCard => isSchool ? 'Staff ID Card' : 'Employee ID Card';

  String get idCardModuleTitle => 'ID Card';

  String get idCardAdminBlurb => isSchool
      ? 'Issue student, staff, and administrator cards. Photos come from records on this device.'
      : 'Issue ${beneficiaries.toLowerCase()}, staff, and administrator cards. Photos come from records on this device.';

  /// Soft-text blurb used when school-only photo matching still applies.
  String get idCardPrintHint => isSchool
      ? 'Preview shows the standard ID card layout. Issue / Print attaches the student photo and prints a landscape card on 58mm/80mm paper (80mm leaves side margins you can trim).'
      : 'Preview shows the standard ID card layout. Issue / Print attaches the ${beneficiary.toLowerCase()} photo and prints a landscape card on 58mm/80mm paper (80mm leaves side margins you can trim).';

  // ASCII hyphens only — ESC/POS TextCommand rejects em/en dashes.
  String get idCardPrintBannerFront => isSchool
      ? 'SCHOOL ID CARD - FRONT'
      : '${beneficiary.toUpperCase()} ID CARD - FRONT';

  String get idCardPrintBannerBack => isSchool
      ? 'SCHOOL ID CARD - BACK'
      : '${beneficiary.toUpperCase()} ID CARD - BACK';

  String get idCardScanHint =>
      isSchool ? 'Scan barcode at the school gate' : 'Scan barcode at the gate clock';

  String get idCardReturnHint => isSchool
      ? 'If found, return this card to the school.'
      : 'If found, return this card to the business.';

  String get idCardAuthorizedSignatory =>
      isSchool ? 'School administrator' : 'Business administrator';

  String get gateClockTitle => isSchool ? 'Gate clock' : 'Attendance clock';

  String get gateClockIn => 'Clock in';

  String get gateClockOut => 'Clock out';

  String get gateWelcome => 'Welcome';

  String get gateGoodbye => 'Goodbye';

  String get attendanceTitle => isSchool
      ? 'Student Attendance'
      : isServices
          ? 'Staff Attendance / Service Visit Log'
          : 'Staff Attendance / Visit Log';

  String get attendanceHistory => isSchool
      ? 'Attendance History'
      : isServices
          ? 'Attendance / Service History'
          : 'Attendance / Visit History';

  String get classAttendance => isSchool ? 'Class Attendance' : 'Group Attendance';

  String get classReportTab => isSchool ? 'Class Report' : 'Group Report';

  String get selectGroupLabel => isSchool ? 'Class / Form' : beneficiaryGroup;

  String get noGroupsEmptyTitle => isSchool
      ? 'No Classes in Academic Setup'
      : 'No Groups Configured';

  String get noGroupsEmptyBody => isSchool
      ? 'School Attendance requires classes from your Academic Setup. Please add classes in Academic Setup first.'
      : '$attendanceTitle requires groups from your setup. Please add groups first.';

  String get academicSetupTooltip => isSchool ? 'Academic Setup' : 'Group Setup';

  String get markAttendance => isSchool ? 'Mark Attendance' : 'Record Attendance';

  String get studentHistoryTab => isSchool ? 'Student History' : '$beneficiary History';

  String get admissionNoLabel => beneficiaryIdShort;

  String get hmoHubTitle => isSchool
      ? 'School Health & Wellness Hub'
      : isServices
          ? 'Client Health & Wellness Hub'
          : 'Customer Health & Wellness Hub';

  String get hmoEnrolment => isSchool
      ? 'School Health Enrolment'
      : isServices
          ? 'Client Health Enrolment'
          : 'Customer Health Enrolment';

  String get hmoPlans => isSchool
      ? 'School Health Plans'
      : isServices
          ? 'Client Health Plans'
          : 'Customer Health Plans';

  String get hmoEnrolInPlan => 'Enrol in $hmoPlans'.replaceFirst('Plans', 'Plan');

  String get hmoNoPlansYet => 'No $hmoPlans Published Yet';

  String get hmoBeneficiary => '$beneficiary Beneficiary';

  String get hmoSelectBeneficiaries => 'Select $beneficiaries';

  String get hmoStudentView => '$beneficiary View';

  String get hmoStaffRole => isSchool ? 'School Staff' : 'Business Staff';

  String get hmoAdminRole => isSchool ? 'School Admin' : 'Business Admin';

  String get hmoStudentPass => '$beneficiary Health Pass';

  String get hmoStudentIdLabel => '$beneficiary ID';

  String get filterChipAll => 'All';

  String get filterChipBeneficiaries => beneficiaries;

  String get filterChipStaff => staffShort;

  String get filterChipAdministrators => administrators;

  /// Filter value keys stay API-stable (student/staff/admin).
  String subjectTypeLabel(String subjectType) {
    switch (subjectType.toLowerCase()) {
      case 'student':
        return beneficiary;
      case 'staff':
        return staffMember;
      case 'admin':
      case 'administrator':
        return administrator;
      default:
        return subjectType;
    }
  }
}
