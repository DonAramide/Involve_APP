import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';


import 'package:equatable/equatable.dart';
import '../../domain/entities/wallet.dart';
import '../../domain/entities/financial_transaction.dart';
import '../../domain/entities/student_finance_profile.dart';
import '../../domain/entities/school_financial_summary.dart';
import '../../domain/entities/daily_revenue.dart';
import '../../domain/repositories/finance_repository.dart';

import '../../data/datasources/finance_realtime_data_source.dart';
import '../../data/models/transaction_model.dart';
import '../../data/models/wallet_model.dart';

import '../../domain/entities/student_financial_summary.dart';
import '../../domain/entities/virtual_account.dart';

part 'finance_event.dart';
part 'finance_state.dart';

class FinanceBloc extends Bloc<FinanceEvent, FinanceState> {
  final IFinanceRepository repository;
  StreamSubscription? _realtimeSubscription;
  
  // Idempotency & Realtime Safety
  final Set<String> _processedTransactionRefs = {};

  FinanceBloc({required this.repository}) : super(FinanceInitial()) {
    on<LoadWallet>(_onLoadWallet);
    on<LoadTransactionHistory>(_onLoadTransactions);
    on<OnPaymentReceived>(_onPaymentReceived);
    on<OnWalletUpdated>(_onWalletUpdated);
    on<LoadSchoolDashboard>(_onLoadDashboard);
    on<RefreshDashboardSummary>(_onRefreshDashboard);
    on<LoadChartData>(_onLoadChartData);
    on<RecordManualPaymentRequested>(_onRecordManualPayment);
    on<LoadStudentProfile>(_onLoadStudentProfile);
  }

  Future<void> _onLoadStudentProfile(LoadStudentProfile event, Emitter<FinanceState> emit) async {
    emit(FinanceLoading());
    try {
      // Fetch in parallel for performance
      final results = await Future.wait([
        repository.getStudentSummary(event.studentId),
        repository.getVirtualAccount(event.studentId),
        repository.getStudentTransactions(event.studentId),
      ]);

      final summary = results[0] as StudentFinancialSummary;
      final virtualAccount = results[1] as VirtualAccount?;
      final transactions = results[2] as List<FinancialTransaction>;

      // Setup Real-time specifically for this student session if needed
      // (Usually handled via a more persistent listener, but we ensure it's active)

      emit(FinanceProfileLoaded(
        summary: summary,
        virtualAccount: virtualAccount,
        transactions: transactions,
      ));
    } catch (e) {
      debugPrint('❌ FinanceBloc Profile Error: $e');
      emit(FinanceError('Failed to load student profile: $e'));
    }
  }

  Future<void> _onRecordManualPayment(RecordManualPaymentRequested event, Emitter<FinanceState> emit) async {
    try {
      await repository.recordManualPayment(
        studentId: event.studentId,
        amount: event.amount,
        method: event.method,
        note: event.note,
      );
      
      // Success: Trigger refreshes. 
      if (state is FinanceProfileLoaded) {
        add(LoadStudentProfile(event.studentId));
      } else {
        add(RefreshDashboardSummary());
      }
    } catch (e) {
      debugPrint('❌ FinanceBloc: Manual Payment Failed: $e');
      emit(FinanceError('Failed to record payment: $e'));
    }
  }




  Future<void> _onLoadWallet(LoadWallet event, Emitter<FinanceState> emit) async {
    debugPrint('🏦 FinanceBloc: Loading Wallet ${event.walletId}');
    emit(FinanceLoading());
    try {
      final wallet = await repository.getWallet(event.walletId);
      final profile = await repository.getFinanceProfile(wallet.ownerId);
      
      // Strict Balance Integrity: Ensure we have the latest from API
      final latestBalance = await repository.getWalletBalance(event.walletId);
      final reconciledWallet = wallet is WalletModel 
          ? (wallet as WalletModel).copyWith(balance: latestBalance)
          : wallet;

      debugPrint('💰 FinanceBloc: Wallet loaded. Balance: $latestBalance');

      // Start Real-time listener
      _realtimeSubscription?.cancel();
      _realtimeSubscription = repository.watchFinanceEvents(event.walletId).listen((rtEvent) {
        if (rtEvent.type == FinanceEventType.paymentSuccess) {
          debugPrint('📨 FinanceBloc: Realtime Payment Event Received');
          add(OnPaymentReceived(rtEvent.data));
        } else if (rtEvent.type == FinanceEventType.walletUpdated) {
          debugPrint('🔄 FinanceBloc: Realtime Wallet Update Event Received');
          add(OnWalletUpdated(rtEvent.data));
        }
      });

      emit(FinanceLoaded(wallet: reconciledWallet, profile: profile));
      add(LoadTransactionHistory(event.walletId));
    } catch (e) {
      debugPrint('❌ FinanceBloc Error: $e');
      emit(FinanceError(e.toString()));
    }
  }

  Future<void> _onLoadTransactions(LoadTransactionHistory event, Emitter<FinanceState> emit) async {
    if (state is! FinanceLoaded) return;
    final currentState = state as FinanceLoaded;
    
    try {
      final transactions = await repository.getTransactions(event.walletId);
      // Update idempotency set with history
      for (var tx in transactions) {
        _processedTransactionRefs.add(tx.reference);
      }
      emit(currentState.copyWith(transactions: transactions));
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: Could not load transaction history: $e');
    }
  }

  Future<void> _onPaymentReceived(OnPaymentReceived event, Emitter<FinanceState> emit) async {
    if (state is! FinanceLoaded) return;
    final currentState = state as FinanceLoaded;
    
    final transaction = TransactionModel.fromJson(event.data);
    
    // 1. Idempotency Check
    if (_processedTransactionRefs.contains(transaction.reference)) {
      debugPrint('🛡️ FinanceBloc: Duplicate transaction ignored: ${transaction.reference}');
      return;
    }

    debugPrint('✅ FinanceBloc: Processing new transaction: ${transaction.reference}');
    _processedTransactionRefs.add(transaction.reference);

    // 2. Balance Integrity: Re-fetch balance from API instead of computing
    try {
      final newBalance = await repository.getWalletBalance(currentState.wallet.id);
      debugPrint('📈 FinanceBloc: Reconciled Balance via API: $newBalance');
      
      final updatedWallet = currentState.wallet is WalletModel
          ? (currentState.wallet as WalletModel).copyWith(balance: newBalance)
          : currentState.wallet;

      final updatedList = [transaction, ...currentState.transactions];
      emit(currentState.copyWith(
        wallet: updatedWallet,
        transactions: updatedList,
      ));
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: Balance reconciliation failed after payment: $e');
    }
  }

  Future<void> _onWalletUpdated(OnWalletUpdated event, Emitter<FinanceState> emit) async {
    if (state is! FinanceLoaded) return;
    final currentState = state as FinanceLoaded;
    
    try {
      // Always fetch fresh balance for integrity
      final updatedWalletData = WalletModel.fromJson(event.data);
      final freshBalance = await repository.getWalletBalance(updatedWalletData.id);
      
      debugPrint('🔄 FinanceBloc: Wallet updated event. Fresh Balance: $freshBalance');
      
      emit(currentState.copyWith(
        wallet: updatedWalletData.copyWith(balance: freshBalance),
      ));
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: Wallet update reconciliation failed: $e');
    }
  }

  Future<void> _onLoadDashboard(LoadSchoolDashboard event, Emitter<FinanceState> emit) async {
    debugPrint('📊 FinanceBloc: Loading School Dashboard');
    emit(FinanceLoading());
    try {
      final summary = await repository.getSchoolSummary();
      final chartData = await repository.getDailyRevenue(days: 7); // Default to last 7 days
      final transactions = await repository.getGlobalTransactions(limit: 50);

      // Start Global Real-time listener
      _realtimeSubscription?.cancel();
      _realtimeSubscription = repository.watchGlobalEvents().listen((rtEvent) {
        debugPrint('🌍 FinanceBloc: Global Payment Event Received');
        add(RefreshDashboardSummary());
      });

      emit(FinanceDashboardLoaded(
        summary: summary,
        chartData: chartData,
        transactions: transactions,
      ));
    } catch (e) {
      debugPrint('❌ FinanceBloc Dashboard Error: $e');
      emit(FinanceError(e.toString()));
    }
  }

  Future<void> _onRefreshDashboard(RefreshDashboardSummary event, Emitter<FinanceState> emit) async {
    if (state is! FinanceDashboardLoaded) return;
    final currentState = state as FinanceDashboardLoaded;

    try {
      final summary = await repository.getSchoolSummary();
      final transactions = await repository.getGlobalTransactions(limit: 50);
      
      emit(currentState.copyWith(
        summary: summary,
        transactions: transactions,
      ));
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: Dashboard refresh failed: $e');
    }
  }

  Future<void> _onLoadChartData(LoadChartData event, Emitter<FinanceState> emit) async {
    if (state is! FinanceDashboardLoaded) return;
    final currentState = state as FinanceDashboardLoaded;

    emit(currentState.copyWith(isRefreshing: true));
    try {
      final chartData = await repository.getDailyRevenue(days: event.days);
      emit(currentState.copyWith(chartData: chartData, isRefreshing: false));
    } catch (e) {
      emit(currentState.copyWith(isRefreshing: false));
    }
  }


  @override
  Future<void> close() {
    _realtimeSubscription?.cancel();
    return super.close();
  }
}

