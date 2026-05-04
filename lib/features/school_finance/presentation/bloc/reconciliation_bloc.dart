// lib/features/school_finance/presentation/bloc/reconciliation_bloc.dart

import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../data/datasources/finance_realtime_data_source.dart';
import 'reconciliation_event.dart';
import 'reconciliation_state.dart';

class ReconciliationBloc extends Bloc<ReconciliationEvent, ReconciliationState> {
  final FinanceRepository _repository;
  StreamSubscription<FinanceRealtimeEvent>? _realtimeSubscription;

  ReconciliationBloc({
    required FinanceRepository repository,
  })  : _repository = repository,
        super(ReconciliationInitial()) {
    
    on<LoadReconciliation>(_onLoadReconciliation);
    on<RefreshReconciliation>(_onRefreshReconciliation);
    on<ApplyFilter>(_onApplyFilter);

    // ── Realtime Setup ────────────────────────────────────────────────────────
    // When a payment success event is detected globally, we refresh the report
    _realtimeSubscription = _repository.watchGlobalEvents().listen((event) {
      if (event.type == FinanceEventType.paymentSuccess) {
        add(RefreshReconciliation());
      }
    });
  }

  Future<void> _onLoadReconciliation(
    LoadReconciliation event,
    Emitter<ReconciliationState> emit,
  ) async {
    emit(ReconciliationLoading());
    try {
      final report = await _repository.getReconciliationReport(
        status: event.status,
        page: event.page,
      );
      emit(ReconciliationLoaded(
        summary: report['summary'],
        payments: report['data'],
        currentStatus: event.status,
        currentPage: event.page,
      ));
    } catch (e) {
      emit(ReconciliationError(e.toString()));
    }
  }

  Future<void> _onRefreshReconciliation(
    RefreshReconciliation event,
    Emitter<ReconciliationState> emit,
  ) async {
    // Only refresh if we are already in a loaded state to preserve filters
    if (state is ReconciliationLoaded) {
      final currentState = state as ReconciliationLoaded;
      try {
        final report = await _repository.getReconciliationReport(
          status: currentState.currentStatus,
          page: currentState.currentPage,
        );
        emit(ReconciliationLoaded(
          summary: report['summary'],
          payments: report['data'],
          currentStatus: currentState.currentStatus,
          currentPage: currentState.currentPage,
        ));
      } catch (e) {
        // Background refresh fails silently or we could emit error if preferred
      }
    } else {
      add(const LoadReconciliation());
    }
  }

  Future<void> _onApplyFilter(
    ApplyFilter event,
    Emitter<ReconciliationState> emit,
  ) async {
    add(LoadReconciliation(status: event.status, page: 1));
  }

  @override
  Future<void> close() {
    _realtimeSubscription?.cancel();
    return super.close();
  }
}
