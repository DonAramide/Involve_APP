// lib/features/health_insurance/presentation/bloc/health_insurance_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/health_insurance_entities.dart';
import '../../domain/repositories/health_insurance_repository.dart';
import 'health_insurance_event.dart';
import 'health_insurance_state.dart';

class HealthInsuranceBloc extends Bloc<HealthInsuranceEvent, HealthInsuranceState> {
  final HealthInsuranceRepository repository;

  HealthInsuranceBloc({required this.repository}) : super(const HealthInsuranceState()) {
    on<LoadHealthInsuranceData>(_onLoadData);
    on<SwitchHealthUserRole>(_onSwitchRole);
    on<SelectGuardianChild>(_onSelectChild);
    on<FilterEnrolments>(_onFilterEnrolments);
    on<SubmitEnrolmentRequest>(_onSubmitEnrolment);
    on<SubmitBulkEnrolmentRequest>(_onSubmitBulkEnrolment);
    on<InitiatePaymentRequest>(_onInitiatePayment);
    on<SimulateSandboxActivationRequest>(_onSimulateSandboxActivation);
    on<ResetHealthInsuranceState>(_onResetState);
  }

  void _onResetState(
    ResetHealthInsuranceState event,
    Emitter<HealthInsuranceState> emit,
  ) {
    emit(const HealthInsuranceState());
  }

  Future<void> _onLoadData(
    LoadHealthInsuranceData event,
    Emitter<HealthInsuranceState> emit,
  ) async {
    emit(state.copyWith(
      status: HealthInsuranceStatus.loading,
      errorMessage: () => null,
      actionSuccessMessage: () => null,
    ));

    try {
      // Fetch authoritative tenant settings & viewer role alongside data endpoints
      final settingsFuture = repository
          .getSettings()
          .then<HealthTenantSettings?>((s) => s)
          .catchError((_) => null);
      final metricsFuture = repository.getOverviewMetrics().catchError((_) => HealthOverviewMetrics.empty());
      final offersFuture = repository.getTenantPlanOffers().catchError((_) => <TenantPlanOffer>[]);
      final childrenFuture = repository.getGuardianChildren().catchError((_) => <GuardianChild>[]);
      final enrolmentsFuture = repository.getEnrolments().catchError((_) => <HealthEnrolment>[]);
      final claimsFuture = repository.getClaims().catchError((_) => <HealthClaim>[]);

      final results = await Future.wait([
        settingsFuture,
        metricsFuture,
        offersFuture,
        childrenFuture,
        enrolmentsFuture,
        claimsFuture,
      ]);

      final settings = results[0] as HealthTenantSettings?;
      final metrics = results[1] as HealthOverviewMetrics;
      final offers = results[2] as List<TenantPlanOffer>;
      final children = results[3] as List<GuardianChild>;
      final enrolments = results[4] as List<HealthEnrolment>;
      final claims = results[5] as List<HealthClaim>;

      final bool tenantChanged = settings != null &&
          settings.tenantId.isNotEmpty &&
          state.activeTenantId != null &&
          state.activeTenantId != settings.tenantId;

      final selectedChild = !tenantChanged &&
              state.selectedChild != null &&
              children.any((c) => c.linkId == state.selectedChild!.linkId)
          ? state.selectedChild
          : (children.isNotEmpty ? children.first : null);

      final resolvedRole = settings != null ? settings.resolvedRole : state.currentRole;

      emit(state.copyWith(
        status: HealthInsuranceStatus.loaded,
        currentRole: resolvedRole,
        tenantSettings: () => settings,
        activeTenantId: () => settings?.tenantId.isNotEmpty == true ? settings!.tenantId : state.activeTenantId,
        metrics: metrics,
        offers: offers,
        guardianChildren: children,
        selectedChild: () => selectedChild,
        enrolments: enrolments,
        claims: claims,
        statusFilter: tenantChanged ? () => null : null,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: HealthInsuranceStatus.error,
        errorMessage: () => 'Failed to load Health & Wellness data: ${e.toString()}',
      ));
    }
  }

  void _onSwitchRole(
    SwitchHealthUserRole event,
    Emitter<HealthInsuranceState> emit,
  ) {
    // When authoritative server settings are loaded, only permit roles authorized by viewerContext
    final settings = state.tenantSettings;
    if (settings != null &&
        settings.permittedRoles.isNotEmpty &&
        !settings.permittedRoles.contains(event.role)) {
      emit(state.copyWith(
        errorMessage: () => 'Role switching is restricted to your authenticated account role.',
      ));
      return;
    }

    emit(state.copyWith(
      currentRole: event.role,
      actionSuccessMessage: () => null,
      errorMessage: () => null,
    ));
  }


  void _onSelectChild(
    SelectGuardianChild event,
    Emitter<HealthInsuranceState> emit,
  ) {
    emit(state.copyWith(
      selectedChild: () => event.child,
      actionSuccessMessage: () => null,
      errorMessage: () => null,
    ));
  }

  void _onFilterEnrolments(
    FilterEnrolments event,
    Emitter<HealthInsuranceState> emit,
  ) {
    emit(state.copyWith(
      statusFilter: () => event.status,
    ));
  }

  Future<void> _onSubmitEnrolment(
    SubmitEnrolmentRequest event,
    Emitter<HealthInsuranceState> emit,
  ) async {
    emit(state.copyWith(isActionLoading: true, errorMessage: () => null, actionSuccessMessage: () => null));
    try {
      await repository.createEnrolment(
        memberId: event.memberId,
        planVersionId: event.planVersionId,
        periodStart: event.periodStart,
        periodEnd: event.periodEnd,
      );

      final enrolments = await repository.getEnrolments().catchError((_) => state.enrolments);
      emit(state.copyWith(
        isActionLoading: false,
        enrolments: enrolments,
        actionSuccessMessage: () => 'Enrolment request submitted successfully. Awaiting verification.',
      ));
    } catch (e) {
      emit(state.copyWith(
        isActionLoading: false,
        errorMessage: () => 'Failed to submit enrolment: ${e.toString()}',
      ));
    }
  }

  Future<void> _onSubmitBulkEnrolment(
    SubmitBulkEnrolmentRequest event,
    Emitter<HealthInsuranceState> emit,
  ) async {
    emit(state.copyWith(isActionLoading: true, errorMessage: () => null, actionSuccessMessage: () => null));
    int successCount = 0;
    final List<String> errors = [];

    for (final memberId in event.memberIds) {
      try {
        await repository.createEnrolment(
          memberId: memberId,
          planVersionId: event.planVersionId,
          periodStart: event.periodStart,
          periodEnd: event.periodEnd,
        );
        successCount++;
      } catch (e) {
        errors.add('$memberId: $e');
      }
    }

    final enrolments = await repository.getEnrolments().catchError((_) => state.enrolments);

    if (errors.isEmpty) {
      emit(state.copyWith(
        isActionLoading: false,
        enrolments: enrolments,
        actionSuccessMessage: () =>
            'Successfully submitted enrolment for $successCount student${successCount > 1 ? "s" : ""}.',
      ));
    } else {
      emit(state.copyWith(
        isActionLoading: false,
        enrolments: enrolments,
        actionSuccessMessage: successCount > 0
            ? () => 'Enrolled $successCount student${successCount > 1 ? "s" : ""}. (${errors.length} failed)'
            : null,
        errorMessage: () => successCount == 0
            ? 'Failed to enrol students: ${errors.first}'
            : 'Enrolled $successCount student${successCount > 1 ? "s" : ""}, but ${errors.length} failed.',
      ));
    }
  }

  Future<void> _onInitiatePayment(
    InitiatePaymentRequest event,
    Emitter<HealthInsuranceState> emit,
  ) async {
    emit(state.copyWith(isActionLoading: true, errorMessage: () => null, actionSuccessMessage: () => null));
    try {
      final res = await repository.initiatePremiumPayment(
        invoiceId: event.invoiceId,
        paymentMethod: event.paymentMethod,
      );
      emit(state.copyWith(
        isActionLoading: false,
        actionSuccessMessage: () => 'Premium payment initiated (${res['payment_reference'] ?? 'Pending'}). Please note: Coverage activates only upon insurer confirmation.',
      ));
    } catch (e) {
      emit(state.copyWith(
        isActionLoading: false,
        errorMessage: () => 'Failed to initiate payment: ${e.toString()}',
      ));
    }
  }

  Future<void> _onSimulateSandboxActivation(
    SimulateSandboxActivationRequest event,
    Emitter<HealthInsuranceState> emit,
  ) async {
    emit(state.copyWith(isActionLoading: true, errorMessage: () => null, actionSuccessMessage: () => null));
    try {
      await repository.simulateSandboxActivation(event.enrolmentId);
      final enrolments = await repository.getEnrolments().catchError((_) => state.enrolments);
      final metrics = await repository.getOverviewMetrics().catchError((_) => state.metrics);

      emit(state.copyWith(
        isActionLoading: false,
        enrolments: enrolments,
        metrics: metrics,
        actionSuccessMessage: () => 'Insurer sandbox activation confirmed. Policy is now ACTIVE.',
      ));
    } catch (e) {
      emit(state.copyWith(
        isActionLoading: false,
        errorMessage: () => 'Failed to activate policy in sandbox: ${e.toString()}',
      ));
    }
  }
}
