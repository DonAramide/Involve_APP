// lib/features/health_insurance/presentation/bloc/health_insurance_event.dart
import 'package:equatable/equatable.dart';
import '../../domain/entities/health_insurance_entities.dart';

abstract class HealthInsuranceEvent extends Equatable {
  const HealthInsuranceEvent();

  @override
  List<Object?> get props => [];
}

class LoadHealthInsuranceData extends HealthInsuranceEvent {
  final bool forceRefresh;
  const LoadHealthInsuranceData({this.forceRefresh = false});

  @override
  List<Object?> get props => [forceRefresh];
}

class SwitchHealthUserRole extends HealthInsuranceEvent {
  final HealthUserRole role;
  const SwitchHealthUserRole(this.role);

  @override
  List<Object?> get props => [role];
}

class SelectGuardianChild extends HealthInsuranceEvent {
  final GuardianChild child;
  const SelectGuardianChild(this.child);

  @override
  List<Object?> get props => [child];
}

class FilterEnrolments extends HealthInsuranceEvent {
  final String? status;
  const FilterEnrolments(this.status);

  @override
  List<Object?> get props => [status];
}

class SubmitEnrolmentRequest extends HealthInsuranceEvent {
  final String memberId;
  final String planVersionId;
  final String periodStart;
  final String periodEnd;

  const SubmitEnrolmentRequest({
    required this.memberId,
    required this.planVersionId,
    required this.periodStart,
    required this.periodEnd,
  });

  @override
  List<Object?> get props => [memberId, planVersionId, periodStart, periodEnd];
}

class SubmitBulkEnrolmentRequest extends HealthInsuranceEvent {
  final List<String> memberIds;
  final String planVersionId;
  final String periodStart;
  final String periodEnd;

  const SubmitBulkEnrolmentRequest({
    required this.memberIds,
    required this.planVersionId,
    required this.periodStart,
    required this.periodEnd,
  });

  @override
  List<Object?> get props => [memberIds, planVersionId, periodStart, periodEnd];
}

class InitiatePaymentRequest extends HealthInsuranceEvent {
  final String invoiceId;
  final String paymentMethod;

  const InitiatePaymentRequest({
    required this.invoiceId,
    required this.paymentMethod,
  });

  @override
  List<Object?> get props => [invoiceId, paymentMethod];
}

class SimulateSandboxActivationRequest extends HealthInsuranceEvent {
  final String enrolmentId;

  const SimulateSandboxActivationRequest(this.enrolmentId);

  @override
  List<Object?> get props => [enrolmentId];
}

class ResetHealthInsuranceState extends HealthInsuranceEvent {
  const ResetHealthInsuranceState();
}

