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

  LoadHistory({this.start, this.end, this.query, this.amount});

  @override
  List<Object?> get props => [start, end, query, amount];
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

  HistoryLoaded(this.invoices, {this.totalSales = 0.0, this.query, this.amount});

  @override
  List<Object?> get props => [invoices, totalSales, query, amount];
}
class HistoryError extends HistoryState {
  final String message;
  HistoryError(this.message);
  @override
  List<Object?> get props => [message];
}
