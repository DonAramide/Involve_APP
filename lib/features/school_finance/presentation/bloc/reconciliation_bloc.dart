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
        summary: _summaryFrom(report),
        payments: _paymentsFrom(report),
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
          summary: _summaryFrom(report),
          payments: _paymentsFrom(report),
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

  Map<String, dynamic> _summaryFrom(Map<String, dynamic> report) {
    final raw = report['summary'];
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return {
      'totalPayments': 0,
      'matched': 0,
      'unmatched': 0,
      'issues': 0,
    };
  }

  List<Map<String, dynamic>> _paymentsFrom(Map<String, dynamic> report) {
    final raw = report['data'];
    if (raw is! List) return const [];
    return raw.map(_normalizePayment).where((row) => row['reference'].toString().isNotEmpty).toList();
  }

  Map<String, dynamic> _normalizePayment(dynamic raw) {
    if (raw is! Map) return {'reference': '', 'amount': 0.0, 'createdAt': DateTime.now().toIso8601String()};
    final item = Map<String, dynamic>.from(raw);
    final amount = item['amount'] ?? item['expectedAmount'] ?? item['actualAmount'] ?? 0;
    return {
      ...item,
      'reference': '${item['reference'] ?? item['txnId'] ?? item['id'] ?? ''}',
      'amount': amount is num ? amount.toDouble() : double.tryParse('$amount') ?? 0.0,
      'createdAt': '${item['createdAt'] ?? item['createdDate'] ?? item['created_at'] ?? DateTime.now().toIso8601String()}',
      'studentName': item['studentName'] ?? item['customerName'] ?? item['txnId'] ?? 'Matched payment',
      'status': '${item['status'] ?? 'SUCCESS'}',
      'issueType': item['issueType'],
    };
  }

  @override
  Future<void> close() {
    _realtimeSubscription?.cancel();
    return super.close();
  }
}
