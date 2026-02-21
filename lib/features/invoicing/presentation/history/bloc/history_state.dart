import 'package:equatable/equatable.dart';
import '../../../domain/entities/invoice.dart';

// Events
abstract class HistoryEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadHistory extends HistoryEvent {
  final DateTime? start;
  final DateTime? end;
  final String? query;
  final double? amount;
  final String? paymentMethod;
  final String? paymentStatus;
  final int? staffId;

  LoadHistory({this.start, this.end, this.query, this.amount, this.paymentMethod, this.paymentStatus, this.staffId});

  @override
  List<Object?> get props => [start, end, query, amount, paymentMethod, paymentStatus, staffId];
}

class RecordPayment extends HistoryEvent {
  final int invoiceId;
  final double additionalAmount;
  final String method;

  RecordPayment({
    required this.invoiceId,
    required this.additionalAmount,
    required this.method,
  });

  @override
  List<Object?> get props => [invoiceId, additionalAmount, method];
}

// States
abstract class HistoryState extends Equatable {
  @override
  List<Object?> get props => [];
}

class HistoryInitial extends HistoryState {}
class HistoryLoading extends HistoryState {}
class HistoryLoaded extends HistoryState {
  final List<Invoice> invoices;
  final double totalSales;
  final String? query;
  final double? amount;
  final String? paymentMethod;
  final String? paymentStatus;
  final int? staffId;

  HistoryLoaded(this.invoices, {this.totalSales = 0.0, this.query, this.amount, this.paymentMethod, this.paymentStatus, this.staffId});

  @override
  List<Object?> get props => [invoices, totalSales, query, amount, paymentMethod, paymentStatus, staffId];
}
class HistoryError extends HistoryState {
  final String message;
  HistoryError(this.message);
  @override
  List<Object?> get props => [message];
}
