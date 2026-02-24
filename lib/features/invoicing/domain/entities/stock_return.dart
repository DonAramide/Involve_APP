import 'package:equatable/equatable.dart';

class StockReturn extends Equatable {
  final int? id;
  final int invoiceId;
  final int itemId;
  final int quantity;
  final double amountReturned;
  final int staffId;
  final DateTime dateReturned;
  final String? syncId;

  const StockReturn({
    this.id,
    required this.invoiceId,
    required this.itemId,
    required this.quantity,
    required this.amountReturned,
    required this.staffId,
    required this.dateReturned,
    this.syncId,
  });

  @override
  List<Object?> get props => [id, invoiceId, itemId, quantity, amountReturned, staffId, dateReturned, syncId];
}
