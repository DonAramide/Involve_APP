import 'package:equatable/equatable.dart';

class SchoolInvoice extends Equatable {
  final String id;
  final String invoiceNumber;
  final String studentId;
  final double amount;
  final double amountPaid;
  final String status; // 'pending', 'partial', 'paid'
  final DateTime dueDate;
  final List<InvoiceLineItem> items;
  final DateTime createdAt;

  const SchoolInvoice({
    required this.id,
    required this.invoiceNumber,
    required this.studentId,
    required this.amount,
    required this.amountPaid,
    required this.status,
    required this.dueDate,
    required this.items,
    required this.createdAt,
  });

  double get balanceDue => amount - amountPaid;

  @override
  List<Object?> get props => [id, invoiceNumber, studentId, amount, amountPaid, status, dueDate, items, createdAt];
}

class InvoiceLineItem extends Equatable {
  final String id;
  final String description;
  final double amount;

  const InvoiceLineItem({
    required this.id,
    required this.description,
    required this.amount,
  });

  @override
  List<Object?> get props => [id, description, amount];
}
