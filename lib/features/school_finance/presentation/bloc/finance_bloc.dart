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

import 'package:involve_app/features/invoicing/domain/repositories/invoice_repository.dart';
import 'package:involve_app/features/school/domain/repositories/school_repository.dart';
import 'package:involve_app/features/invoicing/domain/entities/invoice.dart';

part 'finance_event.dart';
part 'finance_state.dart';

class FinanceBloc extends Bloc<FinanceEvent, FinanceState> {
  final IFinanceRepository repository;
  final InvoiceRepository? invoiceRepository;
  final SchoolRepository? schoolRepository;
  StreamSubscription? _realtimeSubscription;
  
  // Idempotency & Realtime Safety
  final Set<String> _processedTransactionRefs = {};

  FinanceBloc({
    required this.repository,
    this.invoiceRepository,
    this.schoolRepository,
  }) : super(FinanceInitial()) {
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

      emit(FinanceProfileLoaded(
        summary: summary,
        virtualAccount: virtualAccount,
        transactions: transactions,
      ));
    } catch (e) {
      debugPrint('❌ FinanceBloc Profile Error: $e. Trying offline fallback...');
      final studentIdInt = int.tryParse(event.studentId);
      if (invoiceRepository != null && schoolRepository != null && studentIdInt != null) {
        try {
          final studentInvoices = await invoiceRepository!.getInvoicesByStudentId(studentIdInt);
          
          double totalPaid = studentInvoices.fold(0.0, (sum, i) => sum + i.amountPaid);
          double outstandingBalance = studentInvoices.fold(0.0, (sum, i) => sum + i.balanceAmount);
          double totalFees = totalPaid + outstandingBalance;

          final summary = StudentFinancialSummary(
            totalFees: totalFees,
            totalPaid: totalPaid,
            outstandingBalance: outstandingBalance,
            currentBalance: 0.0,
          );

          final List<FinancialTransaction> offlineTx = [];
          for (final inv in studentInvoices) {
            offlineTx.add(FinancialTransaction(
              id: inv.id.toString(),
              walletId: event.studentId,
              amount: inv.totalAmount,
              type: TransactionType.credit,
              reference: inv.invoiceNumber,
              description: 'Fee Payment #${inv.invoiceNumber}',
              balanceAfter: 0.0,
              channel: inv.paymentMethod ?? 'Cash',
              createdAt: inv.dateCreated,
            ));
          }
          offlineTx.sort((a, b) => b.createdAt.compareTo(a.createdAt));

          emit(FinanceProfileLoaded(
            summary: summary,
            virtualAccount: null,
            transactions: offlineTx,
          ));
        } catch (ex) {
          debugPrint('❌ FinanceBloc Profile Offline Fallback Failed: $ex');
          emit(FinanceError('Failed to load student profile: $e'));
        }
      } else {
        emit(FinanceError('Failed to load student profile: $e'));
      }
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
      debugPrint('⚠️ FinanceBloc: Loading transactions failed: $e');
    }
  }

  Future<void> _onPaymentReceived(OnPaymentReceived event, Emitter<FinanceState> emit) async {
    if (state is! FinanceLoaded) return;
    final currentState = state as FinanceLoaded;

    final tx = FinancialTransaction(
      id: event.data['id']?.toString() ?? UniqueKey().toString(),
      walletId: currentState.wallet.id,
      amount: (event.data['amount'] as num).toDouble(),
      type: event.data['type'] == 'credit' ? TransactionType.credit : TransactionType.debit,
      reference: event.data['reference']?.toString() ?? '',
      description: event.data['description']?.toString() ?? 'Virtual Account Payment Received',
      balanceAfter: (event.data['balanceAfter'] as num?)?.toDouble() ?? currentState.wallet.balance,
      channel: event.data['channel']?.toString() ?? 'Transfer',
      createdAt: event.data['createdAt'] != null ? DateTime.parse(event.data['createdAt']) : DateTime.now(),
    );

    // Prevent duplicates
    if (_processedTransactionRefs.contains(tx.reference)) {
      debugPrint('⚠️ FinanceBloc: Duplicate realtime payment transaction ignored: ${tx.reference}');
      return;
    }
    _processedTransactionRefs.add(tx.reference);

    final updatedTransactions = List<FinancialTransaction>.from(currentState.transactions)..insert(0, tx);
    final double updatedBalance = (event.data['balanceAfter'] as num?)?.toDouble() ?? (currentState.wallet.balance + tx.amount);

    final updatedWallet = currentState.wallet is WalletModel
        ? (currentState.wallet as WalletModel).copyWith(balance: updatedBalance)
        : currentState.wallet;

    emit(currentState.copyWith(
      wallet: updatedWallet,
      transactions: updatedTransactions,
    ));
  }

  Future<void> _onWalletUpdated(OnWalletUpdated event, Emitter<FinanceState> emit) async {
    if (state is! FinanceLoaded) return;
    final currentState = state as FinanceLoaded;
    final double freshBalance = (event.data['balance'] as num).toDouble();
    final updatedWallet = currentState.wallet is WalletModel
        ? (currentState.wallet as WalletModel).copyWith(balance: freshBalance)
        : currentState.wallet;

    try {
      final latestTransactions = await repository.getTransactions(currentState.wallet.id);
      
      emit(currentState.copyWith(
        wallet: updatedWallet,
        transactions: latestTransactions,
      ));
    } catch (e) {
      emit(currentState.copyWith(
        wallet: updatedWallet,
      ));
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
      debugPrint('❌ FinanceBloc Dashboard Error: $e. Trying offline fallback...');
      if (invoiceRepository != null && schoolRepository != null) {
        try {
          final invoices = await invoiceRepository!.getAllInvoices();
          final students = await schoolRepository!.getStudents();
          
          double totalRevenue = invoices.fold(0.0, (sum, inv) => sum + inv.amountPaid);
          double outstandingFees = invoices.fold(0.0, (sum, inv) => sum + inv.balanceAmount);
          int paidCount = 0;
          int owingCount = 0;
          final studentInvoices = <int, List<Invoice>>{};
          for (final inv in invoices) {
            if (inv.studentId != null) {
              studentInvoices.putIfAbsent(inv.studentId!, () => []).add(inv);
            }
          }
          for (final entry in studentInvoices.entries) {
            final totalBalance = entry.value.fold(0.0, (sum, i) => sum + i.balanceAmount);
            if (totalBalance > 0) {
              owingCount++;
            } else {
              paidCount++;
            }
          }
          
          final summary = SchoolFinancialSummary(
            totalRevenue: totalRevenue,
            outstandingFees: outstandingFees,
            paidStudentsCount: paidCount,
            owingStudentsCount: owingCount,
            totalStudents: students.length,
            lastUpdated: DateTime.now(),
          );

          final List<DailyRevenue> offlineChart = [];
          final now = DateTime.now();
          for (int i = 6; i >= 0; i--) {
            final targetDate = now.subtract(Duration(days: i));
            final dateStr = "${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}";
            final dayRevenue = invoices.where((inv) {
              final created = inv.dateCreated;
              return created.year == targetDate.year &&
                     created.month == targetDate.month &&
                     created.day == targetDate.day;
            }).fold(0.0, (sum, inv) => sum + inv.amountPaid);
            offlineChart.add(DailyRevenue(date: dateStr, revenue: dayRevenue));
          }

          final List<FinancialTransaction> offlineTx = [];
          for (final inv in invoices) {
            offlineTx.add(FinancialTransaction(
              id: inv.id.toString(),
              walletId: 'local',
              amount: inv.totalAmount,
              type: TransactionType.credit,
              reference: inv.invoiceNumber,
              description: 'Fee Payment #${inv.invoiceNumber} for ${inv.customerName}',
              balanceAfter: 0.0,
              channel: inv.paymentMethod ?? 'Cash',
              createdAt: inv.dateCreated,
            ));
          }
          offlineTx.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          final recentOfflineTx = offlineTx.take(50).toList();

          emit(FinanceDashboardLoaded(
            summary: summary,
            chartData: offlineChart,
            transactions: recentOfflineTx,
          ));
        } catch (ex) {
          debugPrint('❌ FinanceBloc Dashboard Offline Fallback Failed: $ex');
          emit(FinanceError(e.toString()));
        }
      } else {
        emit(FinanceError(e.toString()));
      }
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
      debugPrint('⚠️ FinanceBloc: Dashboard refresh failed, trying offline fallback: $e');
      if (invoiceRepository != null && schoolRepository != null) {
        try {
          final invoices = await invoiceRepository!.getAllInvoices();
          final students = await schoolRepository!.getStudents();
          
          double totalRevenue = invoices.fold(0.0, (sum, inv) => sum + inv.amountPaid);
          double outstandingFees = invoices.fold(0.0, (sum, inv) => sum + inv.balanceAmount);
          int paidCount = 0;
          int owingCount = 0;
          final studentInvoices = <int, List<Invoice>>{};
          for (final inv in invoices) {
            if (inv.studentId != null) {
              studentInvoices.putIfAbsent(inv.studentId!, () => []).add(inv);
            }
          }
          for (final entry in studentInvoices.entries) {
            final totalBalance = entry.value.fold(0.0, (sum, i) => sum + i.balanceAmount);
            if (totalBalance > 0) {
              owingCount++;
            } else {
              paidCount++;
            }
          }
          
          final summary = SchoolFinancialSummary(
            totalRevenue: totalRevenue,
            outstandingFees: outstandingFees,
            paidStudentsCount: paidCount,
            owingStudentsCount: owingCount,
            totalStudents: students.length,
            lastUpdated: DateTime.now(),
          );

          final List<FinancialTransaction> offlineTx = [];
          for (final inv in invoices) {
            offlineTx.add(FinancialTransaction(
              id: inv.id.toString(),
              walletId: 'local',
              amount: inv.totalAmount,
              type: TransactionType.credit,
              reference: inv.invoiceNumber,
              description: 'Fee Payment #${inv.invoiceNumber} for ${inv.customerName}',
              balanceAfter: 0.0,
              channel: inv.paymentMethod ?? 'Cash',
              createdAt: inv.dateCreated,
            ));
          }
          offlineTx.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          final recentOfflineTx = offlineTx.take(50).toList();

          emit(currentState.copyWith(
            summary: summary,
            transactions: recentOfflineTx,
          ));
        } catch (ex) {
          debugPrint('⚠️ FinanceBloc: Offline refresh fallback failed: $ex');
        }
      }
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
      debugPrint('⚠️ FinanceBloc: Load chart data failed, trying offline fallback: $e');
      if (invoiceRepository != null) {
        try {
          final invoices = await invoiceRepository!.getAllInvoices();
          final List<DailyRevenue> offlineChart = [];
          final now = DateTime.now();
          for (int i = event.days - 1; i >= 0; i--) {
            final targetDate = now.subtract(Duration(days: i));
            final dateStr = "${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}";
            final dayRevenue = invoices.where((inv) {
              final created = inv.dateCreated;
              return created.year == targetDate.year &&
                     created.month == targetDate.month &&
                     created.day == targetDate.day;
            }).fold(0.0, (sum, inv) => sum + inv.amountPaid);
            offlineChart.add(DailyRevenue(date: dateStr, revenue: dayRevenue));
          }
          emit(currentState.copyWith(chartData: offlineChart, isRefreshing: false));
        } catch (ex) {
          emit(currentState.copyWith(isRefreshing: false));
        }
      } else {
        emit(currentState.copyWith(isRefreshing: false));
      }
    }
  }


  @override
  Future<void> close() {
    _realtimeSubscription?.cancel();
    return super.close();
  }
}
