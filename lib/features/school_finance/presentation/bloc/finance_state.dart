part of 'finance_bloc.dart';

abstract class FinanceState extends Equatable {
  const FinanceState();

  @override
  List<Object?> get props => [];
}

class FinanceInitial extends FinanceState {}

class FinanceLoading extends FinanceState {}

class FinanceLoaded extends FinanceState {
  final Wallet wallet;
  final List<FinancialTransaction> transactions;
  final StudentFinanceProfile? profile;

  const FinanceLoaded({
    required this.wallet,
    this.transactions = const [],
    this.profile,
  });

  FinanceLoaded copyWith({
    Wallet? wallet,
    List<FinancialTransaction>? transactions,
    StudentFinanceProfile? profile,
  }) {
    return FinanceLoaded(
      wallet: wallet ?? this.wallet,
      transactions: transactions ?? this.transactions,
      profile: profile ?? this.profile,
    );
  }

  @override
  List<Object?> get props => [wallet, transactions, profile];
}

class FinanceDashboardLoaded extends FinanceState {
  final SchoolFinancialSummary summary;
  final List<DailyRevenue> chartData;
  final List<FinancialTransaction> transactions;
  final bool isRefreshing;

  const FinanceDashboardLoaded({
    required this.summary,
    this.chartData = const [],
    this.transactions = const [],
    this.isRefreshing = false,
  });

  FinanceDashboardLoaded copyWith({
    SchoolFinancialSummary? summary,
    List<DailyRevenue>? chartData,
    List<FinancialTransaction>? transactions,
    bool? isRefreshing,
  }) {
    return FinanceDashboardLoaded(
      summary: summary ?? this.summary,
      chartData: chartData ?? this.chartData,
      transactions: transactions ?? this.transactions,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }

  @override
  List<Object?> get props => [summary, chartData, transactions, isRefreshing];
}


class FinanceError extends FinanceState {
  final String message;
  const FinanceError(this.message);

  @override
  List<Object?> get props => [message];
}

class FinanceProfileLoaded extends FinanceState {
  final StudentFinancialSummary summary;
  final VirtualAccount? virtualAccount;
  final List<FinancialTransaction> transactions;
  final bool isRefreshing;

  const FinanceProfileLoaded({
    required this.summary,
    this.virtualAccount,
    required this.transactions,
    this.isRefreshing = false,
  });

  FinanceProfileLoaded copyWith({
    StudentFinancialSummary? summary,
    VirtualAccount? virtualAccount,
    List<FinancialTransaction>? transactions,
    bool? isRefreshing,
  }) {
    return FinanceProfileLoaded(
      summary: summary ?? this.summary,
      virtualAccount: virtualAccount ?? this.virtualAccount,
      transactions: transactions ?? this.transactions,
      isRefreshing: isRefreshing ?? this.isRefreshing,
    );
  }

  @override
  List<Object?> get props => [summary, virtualAccount, transactions, isRefreshing];
}

