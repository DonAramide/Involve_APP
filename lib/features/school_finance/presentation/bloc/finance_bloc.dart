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
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/core/utils/invoice_payment_rail.dart';

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
    // Keep the school dashboard in memory so Back / Withdraw still work.
    if (state is! FinanceLoading) {
      emit(FinanceLoading());
    }
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
          emit(FinanceError(friendlyApiError(e, fallback: 'Could not load student profile.')));
        }
      } else {
        emit(FinanceError(friendlyApiError(e, fallback: 'Could not load student profile.')));
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
      emit(FinanceError(friendlyApiError(e, fallback: 'Could not record payment.')));
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

    SchoolFinancialSummary? remoteSummary;
    List<DailyRevenue> chartData = const [];
    List<FinancialTransaction> remoteTx = const [];

    try {
      remoteSummary = await repository.getSchoolSummary();
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: School summary unavailable: $e');
    }
    try {
      chartData = await repository.getDailyRevenue(days: 7);
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: Daily revenue unavailable: $e');
    }
    try {
      remoteTx = await repository.getGlobalTransactions(limit: 50);
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: Live transactions unavailable: $e');
    }

    List<Invoice> invoices = const [];
    int studentCount = 0;
    if (invoiceRepository != null) {
      try {
        invoices = await invoiceRepository!.getAllInvoices();
      } catch (e) {
        debugPrint('⚠️ FinanceBloc: Local invoices unavailable: $e');
      }
    }
    if (schoolRepository != null) {
      try {
        studentCount = (await schoolRepository!.getStudents()).length;
      } catch (_) {}
    }

    final localSummary = _summaryFromInvoices(invoices, studentCount);
    final localTx = _transactionsFromInvoices(invoices);
    final summary = remoteSummary != null
        ? _mergeRails(remoteSummary, localSummary)
        : localSummary;
    if (chartData.isEmpty) {
      chartData = _chartFromInvoices(invoices, days: 7);
    }
    final transactions = _mergeTransactions(remoteTx, localTx);

    _realtimeSubscription?.cancel();
    try {
      _realtimeSubscription = repository.watchGlobalEvents().listen((rtEvent) {
        debugPrint('🌍 FinanceBloc: Global Payment Event Received');
        add(RefreshDashboardSummary());
      });
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: Realtime listener unavailable: $e');
    }

    emit(FinanceDashboardLoaded(
      summary: summary,
      chartData: chartData,
      transactions: transactions,
    ));
  }

  Future<void> _onRefreshDashboard(RefreshDashboardSummary event, Emitter<FinanceState> emit) async {
    if (state is! FinanceDashboardLoaded) {
      await _onLoadDashboard(LoadSchoolDashboard(), emit);
      return;
    }
    final currentState = state as FinanceDashboardLoaded;

    SchoolFinancialSummary? remoteSummary;
    List<FinancialTransaction> remoteTx = const [];
    try {
      remoteSummary = await repository.getSchoolSummary();
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: Dashboard summary refresh failed: $e');
    }
    try {
      remoteTx = await repository.getGlobalTransactions(limit: 50);
    } catch (e) {
      debugPrint('⚠️ FinanceBloc: Dashboard tx refresh failed: $e');
    }

    List<Invoice> invoices = const [];
    int studentCount = currentState.summary.totalStudents;
    if (invoiceRepository != null) {
      try {
        invoices = await invoiceRepository!.getAllInvoices();
      } catch (_) {}
    }
    if (schoolRepository != null) {
      try {
        studentCount = (await schoolRepository!.getStudents()).length;
      } catch (_) {}
    }

    final localSummary = _summaryFromInvoices(invoices, studentCount);
    final summary = remoteSummary != null
        ? _mergeRails(remoteSummary, localSummary)
        : localSummary;
    final transactions = _mergeTransactions(remoteTx, _transactionsFromInvoices(invoices));

    emit(currentState.copyWith(
      summary: summary,
      transactions: transactions,
    ));
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
          emit(currentState.copyWith(
            chartData: _chartFromInvoices(invoices, days: event.days),
            isRefreshing: false,
          ));
        } catch (ex) {
          emit(currentState.copyWith(isRefreshing: false));
        }
      } else {
        emit(currentState.copyWith(isRefreshing: false));
      }
    }
  }


  SchoolFinancialSummary _summaryFromInvoices(List<Invoice> invoices, int studentCount) {
    double totalRevenue = 0;
    double outstandingFees = 0;
    double card = 0;
    double va = 0;
    double cash = 0;
    final studentInvoices = <int, List<Invoice>>{};

    for (final inv in invoices) {
      final collected = inv.collectedAmount;
      totalRevenue += collected;
      outstandingFees += inv.outstandingAmount;
      final rail = classifyInvoicePaymentRail(inv.paymentMethod);
      if (rail == InvoicePaymentRail.card) {
        card += collected;
      } else if (rail == InvoicePaymentRail.vaTransfer) {
        va += collected;
      } else if (rail == InvoicePaymentRail.cash) {
        cash += collected;
      }
      if (inv.studentId != null) {
        studentInvoices.putIfAbsent(inv.studentId!, () => []).add(inv);
      }
    }

    int paidCount = 0;
    int owingCount = 0;
    for (final entry in studentInvoices.entries) {
      final totalBalance = entry.value.fold(0.0, (sum, i) => sum + i.outstandingAmount);
      if (totalBalance > 0) {
        owingCount++;
      } else {
        paidCount++;
      }
    }

    return SchoolFinancialSummary(
      totalRevenue: totalRevenue,
      outstandingFees: outstandingFees,
      paidStudentsCount: paidCount,
      owingStudentsCount: owingCount,
      totalStudents: studentCount > 0 ? studentCount : studentInvoices.length,
      lastUpdated: DateTime.now(),
      cardCollected: card,
      vaTransferCollected: va,
      cashCollected: cash,
      quasarCollected: card + va,
    );
  }

  SchoolFinancialSummary _mergeRails(
    SchoolFinancialSummary remote,
    SchoolFinancialSummary local,
  ) {
    final card = remote.cardCollected > 0.001 ? remote.cardCollected : local.cardCollected;
    final va = remote.vaTransferCollected > 0.001
        ? remote.vaTransferCollected
        : local.vaTransferCollected;
    final cash = remote.cashCollected > 0.001 ? remote.cashCollected : local.cashCollected;
    final quasar = remote.quasarCollected > 0.001 ? remote.quasarCollected : card + va;
    return SchoolFinancialSummary(
      totalRevenue: remote.totalRevenue > 0.001 ? remote.totalRevenue : local.totalRevenue,
      outstandingFees:
          remote.outstandingFees > 0.001 ? remote.outstandingFees : local.outstandingFees,
      paidStudentsCount: remote.paidStudentsCount > 0
          ? remote.paidStudentsCount
          : local.paidStudentsCount,
      owingStudentsCount: remote.owingStudentsCount > 0
          ? remote.owingStudentsCount
          : local.owingStudentsCount,
      totalStudents: remote.totalStudents > 0 ? remote.totalStudents : local.totalStudents,
      lastUpdated: remote.lastUpdated,
      cardCollected: card,
      vaTransferCollected: va,
      cashCollected: cash,
      quasarCollected: quasar,
    );
  }

  List<FinancialTransaction> _transactionsFromInvoices(List<Invoice> invoices) {
    final txs = <FinancialTransaction>[];
    for (final inv in invoices) {
      final collected = inv.collectedAmount;
      if (collected <= 0) continue;
      txs.add(FinancialTransaction(
        id: inv.id.toString(),
        walletId: inv.studentId?.toString() ?? 'local',
        amount: collected,
        type: TransactionType.credit,
        reference: inv.invoiceNumber,
        description: 'Fee Payment #${inv.invoiceNumber} for ${inv.customerName ?? 'Customer'}',
        balanceAfter: 0.0,
        channel: paymentRailChannelLabel(inv.paymentMethod),
        createdAt: inv.dateCreated,
        metadata: {
          'student_id': inv.studentId?.toString() ?? '',
          'student_name': inv.customerName,
          'payment_method': inv.paymentMethod,
        },
      ));
    }
    txs.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return txs.take(50).toList();
  }

  List<FinancialTransaction> _mergeTransactions(
    List<FinancialTransaction> remote,
    List<FinancialTransaction> local,
  ) {
    final seen = <String>{};
    final merged = <FinancialTransaction>[];
    for (final tx in [...remote, ...local]) {
      final key = tx.reference.trim().isNotEmpty ? tx.reference : tx.id;
      if (seen.contains(key)) continue;
      seen.add(key);
      merged.add(tx);
    }
    merged.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return merged.take(50).toList();
  }

  List<DailyRevenue> _chartFromInvoices(List<Invoice> invoices, {required int days}) {
    final now = DateTime.now();
    final chart = <DailyRevenue>[];
    for (int i = days - 1; i >= 0; i--) {
      final targetDate = now.subtract(Duration(days: i));
      final dateStr =
          '${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}';
      final dayRevenue = invoices.where((inv) {
        final created = inv.dateCreated;
        return created.year == targetDate.year &&
            created.month == targetDate.month &&
            created.day == targetDate.day;
      }).fold(0.0, (sum, inv) => sum + inv.collectedAmount);
      chart.add(DailyRevenue(date: dateStr, revenue: dayRevenue));
    }
    return chart;
  }

  @override
  Future<void> close() {
    _realtimeSubscription?.cancel();
    return super.close();
  }
}
