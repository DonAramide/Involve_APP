// lib/features/school_finance/presentation/bloc/finance_new_bloc.dart

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../data/services/finance_realtime_service.dart';
import 'finance_new_event.dart';
import 'finance_new_state.dart';

class FinanceBloc extends Bloc<FinanceEvent, FinanceState> {
  final FinanceRepository _repository;
  late final FinanceRealtimeService _realtimeService;

  FinanceBloc({
    required FinanceRepository repository,
    required SupabaseClient supabase,
  })  : _repository = repository,
        super(FinanceState.initial()) {
    
    _realtimeService = FinanceRealtimeService(
      supabase: supabase,
      bloc: this,
    );

    on<LoadStudentFinance>(_onLoadStudentFinance);
    on<LoadMoreTransactions>(_onLoadMoreTransactions);
    on<RecordCashPayment>(_onRecordCashPayment);
    on<InitiateExternalPayment>(_onInitiateExternalPayment);
    on<OnPaymentReceived>(_onOnPaymentReceived);
    on<OnWalletUpdated>(_onOnWalletUpdated);

    
    // Alias LoadTransactions to initial load logic if needed
    on<LoadTransactions>((event, emit) => add(LoadStudentFinance(event.walletId)));
  }

  // ── Event Handlers ─────────────────────────────────────────────────────────

  Future<void> _onLoadStudentFinance(
    LoadStudentFinance event,
    Emitter<FinanceState> emit,
  ) async {
    // Reset pagination state on full reload
    emit(state.copyWith(
      isLoading: true, 
      error: null, 
      currentPage: 1, 
      hasMoreData: true,
      transactions: [],
    ));
    
    try {
      final summary = await _repository.getStudentSummary(event.studentId);
      final wallet = await _repository.getWallet(event.studentId);
      final transactions = await _repository.getTransactions(event.studentId, page: 1);

      _realtimeService.init(event.studentId);

      emit(state.copyWith(
        summary: summary,
        wallet: wallet,
        transactions: transactions,
        isLoading: false,
        hasMoreData: transactions.length >= 30, // Assuming 30 is the page limit
      ));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onLoadMoreTransactions(
    LoadMoreTransactions event,
    Emitter<FinanceState> emit,
  ) async {
    if (!state.hasMoreData || state.isLoading) return;

    try {
      final nextPage = state.currentPage + 1;
      final newTransactions = await _repository.getTransactions(
        event.walletId,
        page: nextPage,
      );

      if (newTransactions.isEmpty) {
        emit(state.copyWith(hasMoreData: false));
      } else {
        emit(state.copyWith(
          transactions: [...state.transactions, ...newTransactions],
          currentPage: nextPage,
          hasMoreData: newTransactions.length >= 30,
        ));
      }
    } catch (e) {
      // Background load errors are less intrusive
    }
  }

  Future<void> _onRecordCashPayment(
    RecordCashPayment event,
    Emitter<FinanceState> emit,
  ) async {
    emit(state.copyWith(isSubmitting: true, paymentSuccess: false, error: null));
    try {
      await _repository.recordManualPayment(
        studentId: event.studentId,
        amount: event.amount,
        method: 'cash',
        notes: event.note,
      );
      emit(state.copyWith(isSubmitting: false, paymentSuccess: true));
    } catch (e) {
      emit(state.copyWith(isSubmitting: false, error: 'Payment failed: $e'));
    }
  }

  Future<void> _onInitiateExternalPayment(
    InitiateExternalPayment event,
    Emitter<FinanceState> emit,
  ) async {
    emit(state.copyWith(isSubmitting: true, error: null, paymentIntent: null));
    try {
      final intent = await _repository.initiateQuasarPayment(
        studentId: event.studentId,
        walletId: event.walletId,
        amount: event.amount,
        studentName: event.studentName,
      );
      emit(state.copyWith(isSubmitting: false, paymentIntent: intent));
    } catch (e) {
      emit(state.copyWith(isSubmitting: false, error: 'Initialization failed: $e'));
    }
  }
  Future<void> _onOnPaymentReceived(
    OnPaymentReceived event,
    Emitter<FinanceState> emit,
  ) async {
    try {
      final wallet = await _repository.getWallet(event.walletId);
      // To maintain consistency, we re-fetch the first page
      final transactions = await _repository.getTransactions(event.walletId, page: 1);
      
      emit(state.copyWith(
        wallet: wallet,
        transactions: transactions,
        currentPage: 1, // Reset to page 1 to ensure sync
        hasMoreData: true,
      ));
    } catch (e) {
      // Background sync fail is silent
    }
  }

  Future<void> _onOnWalletUpdated(
    OnWalletUpdated event,
    Emitter<FinanceState> emit,
  ) async {
    try {
      final wallet = await _repository.getWallet(event.walletId);
      emit(state.copyWith(wallet: wallet));
    } catch (e) {
      // Background sync fail is silent
    }
  }

  @override
  Future<void> close() {
    _realtimeService.dispose();
    return super.close();
  }
}
