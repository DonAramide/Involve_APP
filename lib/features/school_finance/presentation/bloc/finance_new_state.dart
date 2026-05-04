// lib/features/school_finance/presentation/bloc/finance_new_state.dart

import 'package:equatable/equatable.dart';
import '../../data/models/finance_models.dart';

class FinanceState extends Equatable {
  final Wallet? wallet;
  final List<Transaction> transactions;
  final StudentFinanceSummary? summary;
  final bool isLoading;
  final bool isSubmitting;
  final bool paymentSuccess;
  final int currentPage;
  final bool hasMoreData;
  final Map<String, dynamic>? paymentIntent;
  final String? error;

  const FinanceState({
    this.wallet,
    this.transactions = const [],
    this.summary,
    this.isLoading = false,
    this.isSubmitting = false,
    this.paymentSuccess = false,
    this.currentPage = 1,
    this.hasMoreData = true,
    this.paymentIntent,
    this.error,
  });



  factory FinanceState.initial() => const FinanceState();

  factory FinanceState.loading() => const FinanceState(isLoading: true);

  FinanceState copyWith({
    Wallet? wallet,
    List<Transaction>? transactions,
    StudentFinanceSummary? summary,
    bool? isLoading,
    bool? isSubmitting,
    bool? paymentSuccess,
    int? currentPage,
    bool? hasMoreData,
    Map<String, dynamic>? paymentIntent,
    String? error,
  }) {
    return FinanceState(
      wallet: wallet ?? this.wallet,
      transactions: transactions ?? this.transactions,
      summary: summary ?? this.summary,
      isLoading: isLoading ?? this.isLoading,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      paymentSuccess: paymentSuccess ?? this.paymentSuccess,
      currentPage: currentPage ?? this.currentPage,
      hasMoreData: hasMoreData ?? this.hasMoreData,
      paymentIntent: paymentIntent ?? this.paymentIntent,
      error: error ?? this.error,
    );
  }

  @override
  List<Object?> get props => [
        wallet,
        transactions,
        summary,
        isLoading,
        isSubmitting,
        paymentSuccess,
        currentPage,
        hasMoreData,
        paymentIntent,
        error
      ];
}


