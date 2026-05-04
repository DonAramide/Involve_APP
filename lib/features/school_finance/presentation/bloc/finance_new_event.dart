// lib/features/school_finance/presentation/bloc/finance_new_event.dart

import 'package:equatable/equatable.dart';

abstract class FinanceEvent extends Equatable {
  const FinanceEvent();

  @override
  List<Object?> get props => [];
}

class LoadStudentFinance extends FinanceEvent {
  final String studentId;

  const LoadStudentFinance(this.studentId);

  @override
  List<Object?> get props => [studentId];
}

class LoadTransactions extends FinanceEvent {
  final String walletId;
  final int page;

  const LoadTransactions(this.walletId, {this.page = 1});

  @override
  List<Object?> get props => [walletId, page];
}

class RecordCashPayment extends FinanceEvent {
  final String studentId;
  final double amount;
  final String? note;

  const RecordCashPayment({
    required this.studentId,
    required this.amount,
    this.note,
  });

  @override
  List<Object?> get props => [studentId, amount, note];
}

/// Triggered by real-time notification (Webhook pulse)
class OnPaymentReceived extends FinanceEvent {
  final String walletId;

  const OnPaymentReceived(this.walletId);

  @override
  List<Object?> get props => [walletId];
}

/// Triggered by real-time notification (Ledger pulse)
class OnWalletUpdated extends FinanceEvent {
  final String walletId;

  const OnWalletUpdated(this.walletId);

  @override
  List<Object?> get props => [walletId];
}

class LoadMoreTransactions extends FinanceEvent {
  final String walletId;

  const LoadMoreTransactions(this.walletId);

  @override
  List<Object?> get props => [walletId];
}

class InitiateExternalPayment extends FinanceEvent {
  final String studentId;
  final String walletId;
  final double amount;
  final String studentName;

  const InitiateExternalPayment({
    required this.studentId,
    required this.walletId,
    required this.amount,
    required this.studentName,
  });

  @override
  List<Object?> get props => [studentId, walletId, amount, studentName];
}


