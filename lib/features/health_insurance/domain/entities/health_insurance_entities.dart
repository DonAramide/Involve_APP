// lib/features/health_insurance/domain/entities/health_insurance_entities.dart
import 'package:equatable/equatable.dart';

enum HealthUserRole {
  parent,
  student,
  staff,
  admin,
}

enum GuardianVerificationStatus {
  pendingVerification,
  verified,
  rejected,
}

enum EnrolmentLifecycleStatus {
  enrolmentPending,
  pendingVerification,
  awaitingPremiumPayment,
  awaitingInsurerActivation,
  active,
  rejected,
  lapsed,
  cancelled,
  unknown,
}

enum PolicyLifecycleStatus {
  pendingActivation,
  active,
  lapsed,
  cancelled,
  suspended,
  unknown,
}

enum ClaimStatus {
  submitted,
  preAuthorized,
  adjudicated,
  paid,
  rejected,
  unknown,
}

/// Insurance provider/HMO entity.
class HealthProvider extends Equatable {
  final String id;
  final String code;
  final String displayName;
  final String? licenceReference;
  final String integrationStatus;

  const HealthProvider({
    required this.id,
    required this.code,
    required this.displayName,
    this.licenceReference,
    required this.integrationStatus,
  });

  factory HealthProvider.fromJson(Map<String, dynamic> json) {
    return HealthProvider(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      displayName: json['display_name'] as String? ?? json['name'] as String? ?? 'Insurance Provider',
      licenceReference: json['licence_reference'] as String?,
      integrationStatus: json['integration_status'] as String? ?? 'active',
    );
  }

  @override
  List<Object?> get props => [id, code, displayName, licenceReference, integrationStatus];
}

/// Insurance plan details.
class HealthPlan extends Equatable {
  final String id;
  final String code;
  final String name;
  final String status;
  final String providerId;
  final String providerName;
  final String planVersionId;
  final String version;
  final int premiumMinor;
  final String currency;
  final String billingFrequency;
  final List<String> memberCategories;
  final Map<String, dynamic> benefits;
  final List<String> exclusions;

  const HealthPlan({
    required this.id,
    required this.code,
    required this.name,
    required this.status,
    required this.providerId,
    required this.providerName,
    required this.planVersionId,
    required this.version,
    required this.premiumMinor,
    required this.currency,
    required this.billingFrequency,
    required this.memberCategories,
    required this.benefits,
    required this.exclusions,
  });

  double get premiumNaira => premiumMinor / 100.0;

  factory HealthPlan.fromJson(Map<String, dynamic> json) {
    final provider = json['hw_providers'] as Map<String, dynamic>?;
    final versions = json['hw_plan_versions'] as List<dynamic>?;
    final firstVersion = versions != null && versions.isNotEmpty
        ? versions.first as Map<String, dynamic>
        : <String, dynamic>{};

    return HealthPlan(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? 'Health Plan',
      status: json['status'] as String? ?? 'active',
      providerId: json['provider_id'] as String? ?? (provider?['id'] as String? ?? ''),
      providerName: provider?['display_name'] as String? ?? 'HMO Partner',
      planVersionId: firstVersion['id'] as String? ?? '',
      version: firstVersion['version'] as String? ?? '1.0',
      premiumMinor: (firstVersion['premium_minor'] as num?)?.toInt() ?? 0,
      currency: firstVersion['currency'] as String? ?? 'NGN',
      billingFrequency: firstVersion['billing_frequency'] as String? ?? 'annual',
      memberCategories: (firstVersion['member_categories'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      benefits: firstVersion['benefits'] is Map<String, dynamic>
          ? firstVersion['benefits'] as Map<String, dynamic>
          : const {},
      exclusions: (firstVersion['exclusions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }

  @override
  List<Object?> get props => [
        id,
        code,
        name,
        status,
        providerId,
        providerName,
        planVersionId,
        version,
        premiumMinor,
        currency,
        billingFrequency,
        memberCategories,
        benefits,
        exclusions,
      ];
}

/// A school's configured plan offer.
class TenantPlanOffer extends Equatable {
  final String id;
  final String defaultFunding;
  final int sharedSplit;
  final bool isActive;
  final String planVersionId;
  final HealthPlan plan;

  const TenantPlanOffer({
    required this.id,
    required this.defaultFunding,
    required this.sharedSplit,
    required this.isActive,
    required this.planVersionId,
    required this.plan,
  });

  factory TenantPlanOffer.fromJson(Map<String, dynamic> json) {
    final version = json['hw_plan_versions'] as Map<String, dynamic>? ?? {};
    final planData = version['hw_plans'] as Map<String, dynamic>? ?? {};
    final providerData = planData['hw_providers'] as Map<String, dynamic>? ?? {};

    final plan = HealthPlan(
      id: planData['id'] as String? ?? '',
      code: planData['code'] as String? ?? '',
      name: planData['name'] as String? ?? 'School Health Plan',
      status: 'active',
      providerId: providerData['id'] as String? ?? '',
      providerName: providerData['display_name'] as String? ?? 'HMO Partner',
      planVersionId: version['id'] as String? ?? '',
      version: version['version'] as String? ?? '1.0',
      premiumMinor: (version['premium_minor'] as num?)?.toInt() ?? 0,
      currency: version['currency'] as String? ?? 'NGN',
      billingFrequency: version['billing_frequency'] as String? ?? 'annual',
      memberCategories: (version['member_categories'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      benefits: version['benefits'] is Map<String, dynamic>
          ? version['benefits'] as Map<String, dynamic>
          : const {},
      exclusions: (version['exclusions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );

    return TenantPlanOffer(
      id: json['id'] as String? ?? '',
      defaultFunding: json['default_funding'] as String? ?? 'self_funded',
      sharedSplit: (json['shared_split'] as num?)?.toInt() ?? 0,
      isActive: json['is_active'] as bool? ?? true,
      planVersionId: version['id'] as String? ?? '',
      plan: plan,
    );
  }

  @override
  List<Object?> get props => [id, defaultFunding, sharedSplit, isActive, planVersionId, plan];
}

/// Student linked to a guardian.
class GuardianChild extends Equatable {
  final String linkId;
  final String relationship;
  final GuardianVerificationStatus status;
  final bool canViewCoverage;
  final bool canViewPremiums;
  final bool canPayPremiums;
  final bool canManageEnrolment;
  final String studentId;
  final String firstName;
  final String lastName;
  final String admissionNumber;
  final String currentClass;
  final String tenantId;
  final String tenantName;

  const GuardianChild({
    required this.linkId,
    required this.relationship,
    required this.status,
    required this.canViewCoverage,
    required this.canViewPremiums,
    required this.canPayPremiums,
    required this.canManageEnrolment,
    required this.studentId,
    required this.firstName,
    required this.lastName,
    required this.admissionNumber,
    required this.currentClass,
    required this.tenantId,
    required this.tenantName,
  });

  String get fullName => '$firstName $lastName'.trim();
  bool get isVerified => status == GuardianVerificationStatus.verified;

  factory GuardianChild.fromJson(Map<String, dynamic> json) {
    final student = json['students'] as Map<String, dynamic>? ?? {};
    final tenant = student['tenants'] as Map<String, dynamic>? ?? {};

    final statusStr = json['status'] as String? ?? 'pending_verification';
    final GuardianVerificationStatus verificationStatus;
    if (statusStr == 'verified') {
      verificationStatus = GuardianVerificationStatus.verified;
    } else if (statusStr == 'rejected') {
      verificationStatus = GuardianVerificationStatus.rejected;
    } else {
      verificationStatus = GuardianVerificationStatus.pendingVerification;
    }

    return GuardianChild(
      linkId: json['id'] as String? ?? '',
      relationship: json['relationship'] as String? ?? 'guardian',
      status: verificationStatus,
      canViewCoverage: json['can_view_coverage'] as bool? ?? true,
      canViewPremiums: json['can_view_premiums'] as bool? ?? true,
      canPayPremiums: json['can_pay_premiums'] as bool? ?? true,
      canManageEnrolment: json['can_manage_enrolment'] as bool? ?? false,
      studentId: student['id'] as String? ?? '',
      firstName: student['first_name'] as String? ?? '',
      lastName: student['last_name'] as String? ?? '',
      admissionNumber: student['admission_number'] as String? ?? '',
      currentClass: student['current_class'] as String? ?? '',
      tenantId: tenant['id'] as String? ?? '',
      tenantName: tenant['name'] as String? ?? 'School',
    );
  }

  @override
  List<Object?> get props => [
        linkId,
        relationship,
        status,
        canViewCoverage,
        canViewPremiums,
        canPayPremiums,
        canManageEnrolment,
        studentId,
        firstName,
        lastName,
        admissionNumber,
        currentClass,
        tenantId,
        tenantName,
      ];
}

/// Enrolment in health insurance.
class HealthEnrolment extends Equatable {
  final String id;
  final EnrolmentLifecycleStatus status;
  final String? statusReason;
  final DateTime? periodStart;
  final DateTime? periodEnd;
  final String? providerSyncStatus;
  final String memberId;
  final String memberCategory;
  final String memberName;
  final String admissionNumber;
  final String planName;
  final String providerName;
  final int premiumMinor;
  final String? policyId;
  final String? policyNumber;
  final PolicyLifecycleStatus policyStatus;

  const HealthEnrolment({
    required this.id,
    required this.status,
    this.statusReason,
    this.periodStart,
    this.periodEnd,
    this.providerSyncStatus,
    required this.memberId,
    required this.memberCategory,
    required this.memberName,
    required this.admissionNumber,
    required this.planName,
    required this.providerName,
    required this.premiumMinor,
    this.policyId,
    this.policyNumber,
    this.policyStatus = PolicyLifecycleStatus.unknown,
  });

  double get premiumNaira => premiumMinor / 100.0;
  bool get isCoverageActive => status == EnrolmentLifecycleStatus.active && policyStatus == PolicyLifecycleStatus.active;

  factory HealthEnrolment.fromJson(Map<String, dynamic> json) {
    final member = json['hw_members'] as Map<String, dynamic>? ?? {};
    final student = member['students'] as Map<String, dynamic>? ?? {};
    final staffProfile = member['hw_staff_profiles'] as Map<String, dynamic>? ?? {};
    final tenantStaff = staffProfile['tenant_staff'] as Map<String, dynamic>? ?? {};

    String memberName = '';
    String admissionNumber = '';
    if (student.isNotEmpty) {
      memberName = '${student['first_name'] ?? ''} ${student['last_name'] ?? ''}'.trim();
      admissionNumber = student['admission_number'] as String? ?? '';
    } else if (tenantStaff.isNotEmpty) {
      memberName = tenantStaff['name'] as String? ?? 'Staff Member';
      admissionNumber = tenantStaff['staff_id'] as String? ?? '';
    }

    final planVersion = json['hw_plan_versions'] as Map<String, dynamic>? ?? {};
    final plan = planVersion['hw_plans'] as Map<String, dynamic>? ?? {};
    final provider = plan['hw_providers'] as Map<String, dynamic>? ?? {};

    final policies = json['hw_policies'];
    Map<String, dynamic>? policy;
    if (policies is List && policies.isNotEmpty) {
      policy = policies.first as Map<String, dynamic>;
    } else if (policies is Map<String, dynamic>) {
      policy = policies;
    }

    final rawStatus = json['status'] as String? ?? '';
    final EnrolmentLifecycleStatus enrolmentStatus;
    switch (rawStatus) {
      case 'active':
        enrolmentStatus = EnrolmentLifecycleStatus.active;
        break;
      case 'awaiting_insurer_activation':
        enrolmentStatus = EnrolmentLifecycleStatus.awaitingInsurerActivation;
        break;
      case 'awaiting_premium_payment':
        enrolmentStatus = EnrolmentLifecycleStatus.awaitingPremiumPayment;
        break;
      case 'awaiting_verification':
      case 'pending_verification':
        enrolmentStatus = EnrolmentLifecycleStatus.pendingVerification;
        break;
      case 'enrolment_pending':
      case 'draft':
        enrolmentStatus = EnrolmentLifecycleStatus.enrolmentPending;
        break;
      case 'rejected':
        enrolmentStatus = EnrolmentLifecycleStatus.rejected;
        break;
      case 'lapsed':
        enrolmentStatus = EnrolmentLifecycleStatus.lapsed;
        break;
      case 'cancelled':
        enrolmentStatus = EnrolmentLifecycleStatus.cancelled;
        break;
      default:
        enrolmentStatus = EnrolmentLifecycleStatus.unknown;
    }

    final rawPolicyStatus = policy?['status'] as String? ?? '';
    final PolicyLifecycleStatus polStatus;
    switch (rawPolicyStatus) {
      case 'active':
        polStatus = PolicyLifecycleStatus.active;
        break;
      case 'pending_activation':
        polStatus = PolicyLifecycleStatus.pendingActivation;
        break;
      case 'lapsed':
        polStatus = PolicyLifecycleStatus.lapsed;
        break;
      case 'cancelled':
        polStatus = PolicyLifecycleStatus.cancelled;
        break;
      case 'suspended':
        polStatus = PolicyLifecycleStatus.suspended;
        break;
      default:
        polStatus = PolicyLifecycleStatus.unknown;
    }

    return HealthEnrolment(
      id: json['id'] as String? ?? '',
      status: enrolmentStatus,
      statusReason: json['status_reason'] as String?,
      periodStart: json['period_start'] != null ? DateTime.tryParse(json['period_start'] as String) : null,
      periodEnd: json['period_end'] != null ? DateTime.tryParse(json['period_end'] as String) : null,
      providerSyncStatus: json['provider_sync_status'] as String?,
      memberId: member['id'] as String? ?? '',
      memberCategory: member['member_category'] as String? ?? 'student',
      memberName: memberName,
      admissionNumber: admissionNumber,
      planName: plan['name'] as String? ?? 'Health Plan',
      providerName: provider['display_name'] as String? ?? 'HMO Partner',
      premiumMinor: (planVersion['premium_minor'] as num?)?.toInt() ?? 0,
      policyId: policy?['id'] as String?,
      policyNumber: policy?['policy_number'] as String?,
      policyStatus: polStatus,
    );
  }

  @override
  List<Object?> get props => [
        id,
        status,
        statusReason,
        periodStart,
        periodEnd,
        providerSyncStatus,
        memberId,
        memberCategory,
        memberName,
        admissionNumber,
        planName,
        providerName,
        premiumMinor,
        policyId,
        policyNumber,
        policyStatus,
      ];
}

/// Claims and authorization records.
class HealthClaim extends Equatable {
  final String id;
  final String claimReference;
  final String recordType;
  final ClaimStatus status;
  final DateTime? statusDate;
  final DateTime? submittedDate;
  final int authorisedAmountMinor;
  final String currency;
  final String? rejectionReason;
  final String facilityName;
  final String memberName;

  const HealthClaim({
    required this.id,
    required this.claimReference,
    required this.recordType,
    required this.status,
    this.statusDate,
    this.submittedDate,
    required this.authorisedAmountMinor,
    required this.currency,
    this.rejectionReason,
    required this.facilityName,
    required this.memberName,
  });

  double get authorisedAmountNaira => authorisedAmountMinor / 100.0;

  factory HealthClaim.fromJson(Map<String, dynamic> json) {
    final member = json['hw_members'] as Map<String, dynamic>? ?? {};
    final student = member['students'] as Map<String, dynamic>? ?? {};
    final memberName = '${student['first_name'] ?? ''} ${student['last_name'] ?? ''}'.trim();

    final facility = json['hw_facilities'] as Map<String, dynamic>? ?? {};
    final facilityName = facility['name'] as String? ?? 'Designated Provider Hospital';

    final rawStatus = json['status'] as String? ?? '';
    final ClaimStatus claimStatus;
    switch (rawStatus) {
      case 'submitted':
        claimStatus = ClaimStatus.submitted;
        break;
      case 'pre_authorized':
      case 'approved':
        claimStatus = ClaimStatus.preAuthorized;
        break;
      case 'adjudicated':
        claimStatus = ClaimStatus.adjudicated;
        break;
      case 'paid':
        claimStatus = ClaimStatus.paid;
        break;
      case 'rejected':
      case 'denied':
        claimStatus = ClaimStatus.rejected;
        break;
      default:
        claimStatus = ClaimStatus.unknown;
    }

    return HealthClaim(
      id: json['id'] as String? ?? '',
      claimReference: json['claim_reference'] as String? ?? 'CLM-0000',
      recordType: json['record_type'] as String? ?? 'claim',
      status: claimStatus,
      statusDate: json['status_date'] != null ? DateTime.tryParse(json['status_date'] as String) : null,
      submittedDate: json['submitted_date'] != null ? DateTime.tryParse(json['submitted_date'] as String) : null,
      authorisedAmountMinor: (json['authorised_amount_minor'] as num?)?.toInt() ?? 0,
      currency: json['currency'] as String? ?? 'NGN',
      rejectionReason: json['rejection_reason'] as String?,
      facilityName: facilityName,
      memberName: memberName,
    );
  }

  @override
  List<Object?> get props => [
        id,
        claimReference,
        recordType,
        status,
        statusDate,
        submittedDate,
        authorisedAmountMinor,
        currency,
        rejectionReason,
        facilityName,
        memberName,
      ];
}

/// Overview dashboard KPIs for the school.
class HealthOverviewMetrics extends Equatable {
  final int totalMembers;
  final int enrolledCount;
  final int activeCoverageCount;
  final int awaitingVerificationCount;
  final int awaitingActivationCount;
  final int incompleteCount;
  final int expiringSoonCount;
  final int billedMinor;
  final int collectedMinor;
  final int outstandingMinor;
  final int claimsCount;
  final int claimsValueMinor;

  const HealthOverviewMetrics({
    required this.totalMembers,
    required this.enrolledCount,
    required this.activeCoverageCount,
    required this.awaitingVerificationCount,
    required this.awaitingActivationCount,
    required this.incompleteCount,
    required this.expiringSoonCount,
    required this.billedMinor,
    required this.collectedMinor,
    required this.outstandingMinor,
    required this.claimsCount,
    required this.claimsValueMinor,
  });

  double get billedNaira => billedMinor / 100.0;
  double get collectedNaira => collectedMinor / 100.0;
  double get outstandingNaira => outstandingMinor / 100.0;
  double get claimsValueNaira => claimsValueMinor / 100.0;
  double get coverageRatePercentage =>
      totalMembers > 0 ? (activeCoverageCount / totalMembers) * 100.0 : 0.0;

  factory HealthOverviewMetrics.fromJson(Map<String, dynamic> json) {
    final members = json['members'] is Map<String, dynamic>
        ? json['members'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final enrolments = json['enrolments'] is Map<String, dynamic>
        ? json['enrolments'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final policies = json['policies'] is Map<String, dynamic>
        ? json['policies'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final billing = json['billing'] is Map<String, dynamic>
        ? json['billing'] as Map<String, dynamic>
        : const <String, dynamic>{};

    final billedMinor = (json['billedMinor'] as num?)?.toInt() ??
        (billing['totalInvoicedKobo'] as num?)?.toInt() ??
        0;
    final collectedMinor = (json['collectedMinor'] as num?)?.toInt() ??
        (billing['totalPaidKobo'] as num?)?.toInt() ??
        0;
    final outstandingMinor = (json['outstandingMinor'] as num?)?.toInt() ??
        (billing['outstandingBalanceKobo'] as num?)?.toInt() ??
        (billedMinor > collectedMinor ? billedMinor - collectedMinor : 0);

    return HealthOverviewMetrics(
      totalMembers: (json['totalMembers'] as num?)?.toInt() ??
          (members['total'] as num?)?.toInt() ??
          0,
      enrolledCount: (json['enrolledCount'] as num?)?.toInt() ??
          (enrolments['total'] as num?)?.toInt() ??
          0,
      activeCoverageCount: (json['activeCoverageCount'] as num?)?.toInt() ??
          (policies['active'] as num?)?.toInt() ??
          (enrolments['active'] as num?)?.toInt() ??
          0,
      awaitingVerificationCount: (json['awaitingVerificationCount'] as num?)?.toInt() ??
          (enrolments['awaitingVerification'] as num?)?.toInt() ??
          0,
      awaitingActivationCount: (json['awaitingActivationCount'] as num?)?.toInt() ??
          (enrolments['awaitingActivation'] as num?)?.toInt() ??
          (enrolments['awaitingPayment'] as num?)?.toInt() ??
          0,
      incompleteCount: (json['incompleteCount'] as num?)?.toInt() ??
          (enrolments['draft'] as num?)?.toInt() ??
          0,
      expiringSoonCount: (json['expiringSoonCount'] as num?)?.toInt() ?? 0,
      billedMinor: billedMinor,
      collectedMinor: collectedMinor,
      outstandingMinor: outstandingMinor,
      claimsCount: (json['claimsCount'] as num?)?.toInt() ?? 0,
      claimsValueMinor: (json['claimsValueMinor'] as num?)?.toInt() ?? 0,
    );
  }

  factory HealthOverviewMetrics.empty() {
    return const HealthOverviewMetrics(
      totalMembers: 0,
      enrolledCount: 0,
      activeCoverageCount: 0,
      awaitingVerificationCount: 0,
      awaitingActivationCount: 0,
      incompleteCount: 0,
      expiringSoonCount: 0,
      billedMinor: 0,
      collectedMinor: 0,
      outstandingMinor: 0,
      claimsCount: 0,
      claimsValueMinor: 0,
    );
  }

  @override
  List<Object?> get props => [
        totalMembers,
        enrolledCount,
        activeCoverageCount,
        awaitingVerificationCount,
        awaitingActivationCount,
        incompleteCount,
        expiringSoonCount,
        billedMinor,
        collectedMinor,
        outstandingMinor,
        claimsCount,
        claimsValueMinor,
      ];
}

class HealthAssignedProvider extends Equatable {
  final String id;
  final String code;
  final String name;
  final String integrationStatus;
  final String? regulatorType;
  final String? licenceReference;
  final String? websiteUrl;
  final String? supportEmail;
  final String? supportPhone;
  final String? headOfficeAddress;

  const HealthAssignedProvider({
    required this.id,
    required this.code,
    required this.name,
    required this.integrationStatus,
    this.regulatorType,
    this.licenceReference,
    this.websiteUrl,
    this.supportEmail,
    this.supportPhone,
    this.headOfficeAddress,
  });

  factory HealthAssignedProvider.fromJson(Map<String, dynamic> json) {
    return HealthAssignedProvider(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString() ??
          json['display_name']?.toString() ??
          'HMO Partner',
      integrationStatus: json['integrationStatus']?.toString() ??
          json['integration_status']?.toString() ??
          'verified',
      regulatorType:
          json['regulatorType']?.toString() ?? json['regulator_type']?.toString(),
      licenceReference: json['licenceReference']?.toString() ??
          json['licence_reference']?.toString(),
      websiteUrl:
          json['websiteUrl']?.toString() ?? json['website_url']?.toString(),
      supportEmail:
          json['supportEmail']?.toString() ?? json['support_email']?.toString(),
      supportPhone:
          json['supportPhone']?.toString() ?? json['support_phone']?.toString(),
      headOfficeAddress: json['headOfficeAddress']?.toString() ??
          json['head_office_address']?.toString(),
    );
  }

  @override
  List<Object?> get props => [
        id,
        code,
        name,
        integrationStatus,
        regulatorType,
        licenceReference,
        websiteUrl,
        supportEmail,
        supportPhone,
        headOfficeAddress,
      ];
}

class HealthTenantSettings extends Equatable {
  final String tenantId;
  final bool enabled;
  final String assignmentMode; // 'LOCKED' | 'SELECTABLE'
  final String assignmentSource; // 'CODE_INHERITED' | 'TENANT_SELECTED' | 'ADMIN_ASSIGNED' | 'UNASSIGNED'
  final bool canChangeProvider;
  final HealthAssignedProvider? assignedProvider;
  final String? onboardingInstitutionCode;
  final String? onboardingInstitutionName;
  final String? onboardingInstitutionType;
  final HealthUserRole resolvedRole;
  final List<HealthUserRole> permittedRoles;
  final bool canManageSettings;

  const HealthTenantSettings({
    required this.tenantId,
    required this.enabled,
    required this.assignmentMode,
    required this.assignmentSource,
    required this.canChangeProvider,
    this.assignedProvider,
    this.onboardingInstitutionCode,
    this.onboardingInstitutionName,
    this.onboardingInstitutionType,
    required this.resolvedRole,
    required this.permittedRoles,
    required this.canManageSettings,
  });

  static HealthUserRole parseViewerRole(String? raw) {
    switch ((raw ?? '').trim().toLowerCase()) {
      case 'school_admin':
      case 'tenant_admin':
      case 'owner':
      case 'admin':
        return HealthUserRole.admin;
      case 'staff':
        return HealthUserRole.staff;
      case 'student':
        return HealthUserRole.student;
      case 'parent_guardian':
      case 'parent':
      case 'guardian':
      default:
        return HealthUserRole.parent;
    }
  }

  factory HealthTenantSettings.fromJson(Map<String, dynamic> json) {
    final viewer = json['viewerContext'] is Map<String, dynamic>
        ? json['viewerContext'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final onboarding = json['onboardingInstitution'] is Map<String, dynamic>
        ? json['onboardingInstitution'] as Map<String, dynamic>
        : const <String, dynamic>{};
    final assignedMap = json['assignedProvider'] is Map<String, dynamic>
        ? json['assignedProvider'] as Map<String, dynamic>
        : null;

    final resolvedRole = parseViewerRole(viewer['role']?.toString());
    final rawPermitted = viewer['permittedRoles'] is List
        ? (viewer['permittedRoles'] as List).map((e) => parseViewerRole(e?.toString())).toSet().toList()
        : <HealthUserRole>[resolvedRole];

    return HealthTenantSettings(
      tenantId: json['tenantId']?.toString() ?? viewer['tenantId']?.toString() ?? '',
      enabled: json['enabled'] == true,
      assignmentMode: json['assignmentMode']?.toString() ?? 'SELECTABLE',
      assignmentSource: json['assignmentSource']?.toString() ?? 'UNASSIGNED',
      canChangeProvider: json['canChangeProvider'] == true,
      assignedProvider:
          assignedMap != null ? HealthAssignedProvider.fromJson(assignedMap) : null,
      onboardingInstitutionCode: onboarding['institutionCode']?.toString(),
      onboardingInstitutionName: onboarding['institutionName']?.toString(),
      onboardingInstitutionType: onboarding['institutionType']?.toString(),
      resolvedRole: resolvedRole,
      permittedRoles: rawPermitted.isEmpty ? <HealthUserRole>[resolvedRole] : rawPermitted,
      canManageSettings: viewer['canManageSettings'] == true,
    );
  }

  factory HealthTenantSettings.empty({
    String tenantId = '',
    HealthUserRole role = HealthUserRole.parent,
  }) {
    return HealthTenantSettings(
      tenantId: tenantId,
      enabled: false,
      assignmentMode: 'SELECTABLE',
      assignmentSource: 'UNASSIGNED',
      canChangeProvider: false,
      assignedProvider: null,
      resolvedRole: role,
      permittedRoles: <HealthUserRole>[role],
      canManageSettings: false,
    );
  }

  @override
  List<Object?> get props => [
        tenantId,
        enabled,
        assignmentMode,
        assignmentSource,
        canChangeProvider,
        assignedProvider,
        onboardingInstitutionCode,
        onboardingInstitutionName,
        onboardingInstitutionType,
        resolvedRole,
        permittedRoles,
        canManageSettings,
      ];
}

