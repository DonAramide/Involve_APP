// lib/features/school_finance/presentation/bloc/reconciliation_state.dart

import 'package:equatable/equatable.dart';

abstract class ReconciliationState extends Equatable {
  const ReconciliationState();

  @override
  List<Object?> get props => [];
}

class ReconciliationInitial extends ReconciliationState {}

class ReconciliationLoading extends ReconciliationState {}

class ReconciliationLoaded extends ReconciliationState {
  final Map<String, dynamic> summary;
  final List<dynamic> payments;
  final String? currentStatus;
  final int currentPage;

  const ReconciliationLoaded({
    required this.summary,
    required this.payments,
    this.currentStatus,
    this.currentPage = 1,
  });

  @override
  List<Object?> get props => [summary, payments, currentStatus, currentPage];
}

class ReconciliationError extends ReconciliationState {
  final String message;

  const ReconciliationError(this.message);

  @override
  List<Object?> get props => [message];
}
