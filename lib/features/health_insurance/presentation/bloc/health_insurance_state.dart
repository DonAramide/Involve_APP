// lib/features/health_insurance/presentation/bloc/health_insurance_state.dart
import 'package:equatable/equatable.dart';
import '../../domain/entities/health_insurance_entities.dart';

enum HealthInsuranceStatus {
  initial,
  loading,
  loaded,
  error,
}

class HealthInsuranceState extends Equatable {
  final HealthInsuranceStatus status;
  final HealthUserRole currentRole;
  final HealthTenantSettings? tenantSettings;
  final String? activeTenantId;
  final HealthOverviewMetrics metrics;
  final List<TenantPlanOffer> offers;
  final List<GuardianChild> guardianChildren;
  final GuardianChild? selectedChild;
  final List<HealthEnrolment> enrolments;
  final List<HealthClaim> claims;
  final String? statusFilter;
  final String? errorMessage;
  final String? actionSuccessMessage;
  final bool isActionLoading;

  const HealthInsuranceState({
    this.status = HealthInsuranceStatus.initial,
    this.currentRole = HealthUserRole.parent,
    this.tenantSettings,
    this.activeTenantId,
    this.metrics = const HealthOverviewMetrics(
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
    ),
    this.offers = const [],
    this.guardianChildren = const [],
    this.selectedChild,
    this.enrolments = const [],
    this.claims = const [],
    this.statusFilter,
    this.errorMessage,
    this.actionSuccessMessage,
    this.isActionLoading = false,
  });

  HealthInsuranceState copyWith({
    HealthInsuranceStatus? status,
    HealthUserRole? currentRole,
    HealthTenantSettings? Function()? tenantSettings,
    String? Function()? activeTenantId,
    HealthOverviewMetrics? metrics,
    List<TenantPlanOffer>? offers,
    List<GuardianChild>? guardianChildren,
    GuardianChild? Function()? selectedChild,
    List<HealthEnrolment>? enrolments,
    List<HealthClaim>? claims,
    String? Function()? statusFilter,
    String? Function()? errorMessage,
    String? Function()? actionSuccessMessage,
    bool? isActionLoading,
  }) {
    return HealthInsuranceState(
      status: status ?? this.status,
      currentRole: currentRole ?? this.currentRole,
      tenantSettings:
          tenantSettings != null ? tenantSettings() : this.tenantSettings,
      activeTenantId:
          activeTenantId != null ? activeTenantId() : this.activeTenantId,
      metrics: metrics ?? this.metrics,
      offers: offers ?? this.offers,
      guardianChildren: guardianChildren ?? this.guardianChildren,
      selectedChild: selectedChild != null ? selectedChild() : this.selectedChild,
      enrolments: enrolments ?? this.enrolments,
      claims: claims ?? this.claims,
      statusFilter: statusFilter != null ? statusFilter() : this.statusFilter,
      errorMessage: errorMessage != null ? errorMessage() : this.errorMessage,
      actionSuccessMessage: actionSuccessMessage != null ? actionSuccessMessage() : this.actionSuccessMessage,
      isActionLoading: isActionLoading ?? this.isActionLoading,
    );
  }

  HealthAssignedProvider? get assignedProvider => tenantSettings?.assignedProvider;

  /// Convenience getters for role-specific views
  List<HealthEnrolment> get filteredEnrolments {
    if (statusFilter == null || statusFilter!.isEmpty) return enrolments;
    return enrolments.where((e) {
      final statusName = e.status.name.toLowerCase();
      return statusName == statusFilter!.toLowerCase().replaceAll('_', '');
    }).toList();
  }

  /// Active student policy for student view
  HealthEnrolment? get studentActiveEnrolment {
    try {
      return enrolments.firstWhere(
        (e) => e.memberCategory == 'student' && e.isCoverageActive,
      );
    } catch (_) {
      return enrolments.isNotEmpty ? enrolments.first : null;
    }
  }

  /// Active staff policy for staff view
  HealthEnrolment? get staffActiveEnrolment {
    try {
      return enrolments.firstWhere(
        (e) => e.memberCategory == 'staff',
      );
    } catch (_) {
      return null;
    }
  }

  @override
  List<Object?> get props => [
        status,
        currentRole,
        tenantSettings,
        activeTenantId,
        metrics,
        offers,
        guardianChildren,
        selectedChild,
        enrolments,
        claims,
        statusFilter,
        errorMessage,
        actionSuccessMessage,
        isActionLoading,
      ];
}

