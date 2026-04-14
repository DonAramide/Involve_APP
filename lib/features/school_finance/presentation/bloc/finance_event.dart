part of 'finance_bloc.dart';

abstract class FinanceEvent extends Equatable {
  const FinanceEvent();

  @override
  List<Object?> get props => [];
}

class LoadWallet extends FinanceEvent {
  final String walletId;
  const LoadWallet(this.walletId);

  @override
  List<Object?> get props => [walletId];
}

class LoadTransactionHistory extends FinanceEvent {
  final String walletId;
  const LoadTransactionHistory(this.walletId);
}

class LoadSchoolDashboard extends FinanceEvent {}

class RefreshDashboardSummary extends FinanceEvent {}

class LoadChartData extends FinanceEvent {
  final int days;
  const LoadChartData({required this.days});

  @override
  List<Object?> get props => [days];
}

class RecordManualPaymentRequested extends FinanceEvent {
  final String studentId;
  final double amount;
  final String method;
  final String? note;

  const RecordManualPaymentRequested({
    required this.studentId,
    required this.amount,
    required this.method,
    this.note,
  });

  @override
  List<Object?> get props => [studentId, amount, method, note];
}

class LoadStudentProfile extends FinanceEvent {
  final String studentId;

  const LoadStudentProfile(this.studentId);

  @override
  List<Object?> get props => [studentId];
}


// Real-time Events
class OnPaymentReceived extends FinanceEvent {
  final Map<String, dynamic> data;
  const OnPaymentReceived(this.data);
}

class OnWalletUpdated extends FinanceEvent {
  final Map<String, dynamic> data;
  const OnWalletUpdated(this.data);
}
