import 'package:flutter_bloc/flutter_bloc.dart';
import 'invoice_state.dart';
import '../../domain/entities/invoice.dart';
import '../../domain/services/invoice_calculation_service.dart';
import '../../domain/repositories/invoice_repository.dart';

class InvoiceBloc extends Bloc<InvoiceEvent, InvoiceState> {
  final InvoiceCalculationService calculationService;
  final InvoiceRepository repository;

  InvoiceBloc({
    required this.calculationService,
    required this.repository,
  }) : super(const InvoiceState()) {
    on<AddItemToInvoice>(_onAddItem);
    on<RemoveItemFromInvoice>(_onRemoveItem);
    on<UpdateDiscount>(_onUpdateDiscount);
    on<SaveInvoice>(_onSaveInvoice);
    on<ResetInvoice>(_onReset);
    on<UpdateInvoiceSettings>(_onUpdateSettings);
  }

  void _onAddItem(AddItemToInvoice event, Emitter<InvoiceState> emit) {
    final updatedItems = List<InvoiceItem>.from(state.items);
    final existingIndex = updatedItems.indexWhere((i) => i.item.id == event.item.id);

    if (existingIndex >= 0) {
      final existingItem = updatedItems[existingIndex];
      updatedItems[existingIndex] = existingItem.copyWith(
        quantity: existingItem.quantity + event.quantity,
      );
    } else {
      updatedItems.add(InvoiceItem(
        item: event.item,
        quantity: event.quantity,
        unitPrice: event.item.price,
      ));
    }

    _emitUpdatedState(updatedItems, state.discount, emit);
  }

  void _onRemoveItem(RemoveItemFromInvoice event, Emitter<InvoiceState> emit) {
    final updatedItems = state.items.where((i) => i.item.id != event.item.id).toList();
    _emitUpdatedState(updatedItems, state.discount, emit);
  }

  void _onUpdateDiscount(UpdateDiscount event, Emitter<InvoiceState> emit) {
    _emitUpdatedState(state.items, event.discount, emit);
  }

  Future<void> _onSaveInvoice(SaveInvoice event, Emitter<InvoiceState> emit) async {
    emit(state.copyWith(isSaving: true));
    try {
      final invoice = Invoice(
        invoiceNumber: calculationService.generateInvoiceNumber(),
        dateCreated: DateTime.now(),
        items: state.items,
        subtotal: state.subtotal,
        taxAmount: state.tax,
        discountAmount: state.discount,
        totalAmount: state.total,
        paymentStatus: 'Paid',
      );

      await repository.saveInvoice(invoice);
      emit(state.copyWith(isSaving: false, isSaved: true));
    } catch (e) {
      emit(state.copyWith(isSaving: false, error: e.toString()));
    }
  }

  void _onReset(ResetInvoice event, Emitter<InvoiceState> emit) {
    emit(InvoiceState(taxRate: state.taxRate, taxEnabled: state.taxEnabled));
  }

  void _onUpdateSettings(UpdateInvoiceSettings event, Emitter<InvoiceState> emit) {
    emit(state.copyWith(
      taxRate: event.taxRate,
      taxEnabled: event.taxEnabled,
    ));
    _emitUpdatedState(state.items, state.discount, emit);
  }

  void _emitUpdatedState(List<InvoiceItem> items, double discount, Emitter<InvoiceState> emit) {
    final subtotal = calculationService.calculateSubtotal(items);
    final tax = calculationService.calculateTax(subtotal, state.taxRate, state.taxEnabled);
    final total = calculationService.calculateTotal(subtotal, tax, discount);

    emit(state.copyWith(
      items: items,
      subtotal: subtotal,
      tax: tax,
      discount: discount,
      total: total,
      isSaved: false,
    ));
  }
}
