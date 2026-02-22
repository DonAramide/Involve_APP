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
    on<UpdateCustomerInfo>(_onUpdateCustomer);
    on<UpdatePaymentMethod>(_onUpdatePaymentMethod);
    on<UpdateStaffInfo>(_onUpdateStaff);
    on<UpdateItemPrintPrice>(_onUpdateItemPrintPrice);
  }

  void _onAddItem(AddItemToInvoice event, Emitter<InvoiceState> emit) {
    final updatedItems = List<InvoiceItem>.from(state.items);
    
    // Find existing item with same ID AND same service metadata
    final existingIndex = updatedItems.indexWhere((i) => 
      i.item.id == event.item.id && i.serviceMeta == event.serviceMeta
    );

    if (existingIndex >= 0) {
      final existingItem = updatedItems[existingIndex];
      // For services, we might not want to just increase quantity if it's a booking logic
      // But if the meta is identical, it's the same booking slot, so increasing quantity is valid 
      // (e.g. 2 rooms for same dates).
      final newQuantity = existingItem.quantity + event.quantity;
      if (newQuantity <= 0) {
        updatedItems.removeAt(existingIndex);
      } else {
        updatedItems[existingIndex] = existingItem.copyWith(quantity: newQuantity);
      }
    } else if (event.quantity > 0) {
      updatedItems.add(InvoiceItem(
        item: event.item,
        quantity: event.quantity,
        unitPrice: event.item.price,
        type: event.item.type,
        serviceMeta: event.serviceMeta,
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

  void _onUpdateItemPrintPrice(UpdateItemPrintPrice event, Emitter<InvoiceState> emit) {
    final updatedItems = state.items.map((item) {
      if (item.item.id == event.itemId) {
        return item.copyWith(printPrice: event.printPrice);
      }
      return item;
    }).toList();
    _emitUpdatedState(updatedItems, state.discount, emit);
  }

  Future<void> _onSaveInvoice(SaveInvoice event, Emitter<InvoiceState> emit) async {
    emit(state.copyWith(isSaving: true));
    try {
      final amountPaid = event.amountPaid ?? (state.paymentMethod == 'Deferred' ? 0.0 : state.total);
      final balance = state.total - amountPaid;
      
      final String status;
      if (event.paymentStatus != null) {
        status = event.paymentStatus!;
      } else {
        if (amountPaid <= 0) {
          status = 'Unpaid';
        } else if (amountPaid < state.total) {
          status = 'Partial';
        } else {
          status = 'Paid';
        }
      }

      final totalPrintAmount = calculationService.calculateTotalPrintAmount(
        state.items, 
        state.taxRate, 
        state.taxEnabled, 
        state.discount,
      );

      final invoice = Invoice(
        invoiceNumber: event.invoiceNumber ?? calculationService.generateInvoiceNumber(),
        dateCreated: DateTime.now(),
        items: state.items,
        subtotal: state.subtotal,
        taxAmount: state.tax,
        discountAmount: state.discount,
        totalAmount: state.total,
        paymentStatus: status,
        amountPaid: amountPaid,
        balanceAmount: balance,
        customerName: state.customerName,
        customerAddress: state.customerAddress,
        paymentMethod: state.paymentMethod,
        staffId: state.staffId,
        staffName: state.staffName,
        totalPrintAmount: totalPrintAmount,
      );

      await repository.saveInvoice(invoice);
      emit(state.copyWith(isSaving: false, isSaved: true));
    } catch (e) {
      emit(state.copyWith(isSaving: false, error: e.toString()));
    }
  }

  void _onReset(ResetInvoice event, Emitter<InvoiceState> emit) {
    emit(InvoiceState(
      taxRate: state.taxRate,
      taxEnabled: state.taxEnabled,
      discountEnabled: state.discountEnabled,
    ));
  }

  void _onUpdateCustomer(UpdateCustomerInfo event, Emitter<InvoiceState> emit) {
    emit(state.copyWith(
      customerName: event.name,
      customerAddress: event.address,
    ));
  }

  void _onUpdatePaymentMethod(UpdatePaymentMethod event, Emitter<InvoiceState> emit) {
    emit(state.copyWith(paymentMethod: event.paymentMethod));
  }

  void _onUpdateStaff(UpdateStaffInfo event, Emitter<InvoiceState> emit) {
    emit(state.copyWith(
      staffId: event.staffId,
      staffName: event.staffName,
    ));
  }

  void _onUpdateSettings(UpdateInvoiceSettings event, Emitter<InvoiceState> emit) {
    emit(state.copyWith(
      taxRate: event.taxRate,
      taxEnabled: event.taxEnabled,
      discountEnabled: event.discountEnabled,
    ));
    // If discount is disabled, reset any existing discount
    final currentDiscount = event.discountEnabled ? state.discount : 0.0;
    _emitUpdatedState(state.items, currentDiscount, emit);
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
