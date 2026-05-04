// lib/features/school_finance/presentation/bloc/reconciliation_event.dart

import 'package:equatable/equatable.dart';

abstract class ReconciliationEvent extends Equatable {
  const ReconciliationEvent();

  @override
  List<Object?> get props => [];
}

class LoadReconciliation extends ReconciliationEvent {
  final String? status;
  final int page;

  const LoadReconciliation({this.status, this.page = 1});

  @override
  List<Object?> get props => [status, page];
}

class RefreshReconciliation extends ReconciliationEvent {}

class ApplyFilter extends ReconciliationEvent {
  final String? status;

  const ApplyFilter(this.status);

  @override
  List<Object?> get props => [status];
}
