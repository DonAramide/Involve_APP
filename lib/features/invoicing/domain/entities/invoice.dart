import 'package:equatable/equatable.dart';
import '../../../stock/domain/entities/item.dart';

class InvoiceItem extends Equatable {
  final int? id;
  final Item item;
  final int quantity;
  final double unitPrice;

  const InvoiceItem({
    this.id,
    required this.item,
    required this.quantity,
    required this.unitPrice,
  });

  double get total => quantity * unitPrice;

  InvoiceItem copyWith({
    int? id,
    Item? item,
    int? quantity,
    double? unitPrice,
  }) {
    return InvoiceItem(
      id: id ?? this.id,
      item: item ?? this.item,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
    );
  }

  @override
  List<Object?> get props => [id, item, quantity, unitPrice];
}

class Invoice extends Equatable {
  final int? id;
  final String invoiceNumber;
  final DateTime dateCreated;
  final List<InvoiceItem> items;
  final double subtotal;
  final double taxAmount;
  final double discountAmount;
  final double totalAmount;
  final String paymentStatus;
  final String? customerName;
  final String? customerAddress;
  final String? paymentMethod; // 'Cash', 'POS', 'Transfer'

  const Invoice({
    this.id,
    required this.invoiceNumber,
    required this.dateCreated,
    required this.items,
    required this.subtotal,
    required this.taxAmount,
    required this.discountAmount,
    required this.totalAmount,
    required this.paymentStatus,
    this.customerName,
    this.customerAddress,
    this.paymentMethod,
  });

  @override
  List<Object?> get props => [
        id,
        invoiceNumber,
        dateCreated,
        items,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paymentStatus,
        customerName,
        customerAddress,
        paymentMethod,
      ];
}
