import 'package:equatable/equatable.dart';
import '../../domain/entities/invoice.dart';
import '../../../stock/domain/entities/item.dart';

// Events
abstract class InvoiceEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class AddItemToInvoice extends InvoiceEvent {
  final Item item;
  final int quantity;
  final String? serviceMeta;
  AddItemToInvoice(this.item, this.quantity, {this.serviceMeta});
  @override
  List<Object?> get props => [item, quantity, serviceMeta];
}

class RemoveItemFromInvoice extends InvoiceEvent {
  final Item item;
  RemoveItemFromInvoice(this.item);
  @override
  List<Object?> get props => [item];
}

class UpdateDiscount extends InvoiceEvent {
  final double discount;
  UpdateDiscount(this.discount);
  @override
  List<Object?> get props => [discount];
}

class UpdateCustomerInfo extends InvoiceEvent {
  final String? name;
  final String? address;
  UpdateCustomerInfo({this.name, this.address});
  @override
  List<Object?> get props => [name, address];
}

class UpdatePaymentMethod extends InvoiceEvent {
  final String? paymentMethod;
  UpdatePaymentMethod(this.paymentMethod);
  @override
  List<Object?> get props => [paymentMethod];
}

class SaveInvoice extends InvoiceEvent {}

class ResetInvoice extends InvoiceEvent {}

class UpdateInvoiceSettings extends InvoiceEvent {
  final double taxRate;
  final bool taxEnabled;
  final bool discountEnabled;
  UpdateInvoiceSettings({
    required this.taxRate,
    required this.taxEnabled,
    required this.discountEnabled,
  });
  @override
  List<Object?> get props => [taxRate, taxEnabled, discountEnabled];
}

// State
class InvoiceState extends Equatable {
  final List<InvoiceItem> items;
  final double subtotal;
  final double tax;
  final double discount;
  final double total;
  final bool isSaving;
  final bool isSaved;
  final String? error;
  final double taxRate;
  final bool taxEnabled;
  final bool discountEnabled;
  final String? customerName;
  final String? customerAddress;
  final String? paymentMethod;

  const InvoiceState({
    this.items = const [],
    this.subtotal = 0,
    this.tax = 0,
    this.discount = 0,
    this.total = 0,
    this.isSaving = false,
    this.isSaved = false,
    this.error,
    this.taxRate = 0.0,
    this.taxEnabled = true,
    this.discountEnabled = true,
    this.customerName,
    this.customerAddress,
    this.paymentMethod,
  });

  InvoiceState copyWith({
    List<InvoiceItem>? items,
    double? subtotal,
    double? tax,
    double? discount,
    double? total,
    bool? isSaving,
    bool? isSaved,
    String? error,
    double? taxRate,
    bool? taxEnabled,
    bool? discountEnabled,
    String? customerName,
    String? customerAddress,
    String? paymentMethod,
  }) {
    return InvoiceState(
      items: items ?? this.items,
      subtotal: subtotal ?? this.subtotal,
      tax: tax ?? this.tax,
      discount: discount ?? this.discount,
      total: total ?? this.total,
      isSaving: isSaving ?? this.isSaving,
      isSaved: isSaved ?? this.isSaved,
      error: error ?? this.error,
      taxRate: taxRate ?? this.taxRate,
      taxEnabled: taxEnabled ?? this.taxEnabled,
      discountEnabled: discountEnabled ?? this.discountEnabled,
      customerName: customerName ?? this.customerName,
      customerAddress: customerAddress ?? this.customerAddress,
      paymentMethod: paymentMethod ?? this.paymentMethod,
    );
  }

  @override
  List<Object?> get props => [
        items,
        subtotal,
        tax,
        discount,
        total,
        isSaving,
        isSaved,
        error,
        taxRate,
        taxEnabled,
        discountEnabled,
        customerName,
        customerAddress,
        paymentMethod,
      ];
}
