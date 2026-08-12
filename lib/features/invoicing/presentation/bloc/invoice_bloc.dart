import 'package:flutter_bloc/flutter_bloc.dart';
import 'dart:convert';
import 'package:involve_app/core/utils/api_error_message.dart';
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
    on<UpdateSchoolInfo>(_onUpdateSchool);
    on<UpdateBusinessMode>(_onUpdateBusinessMode);
    on<InitiateVirtualAccount>(_onInitiateVirtualAccount);
    on<UpdateWarrantyDuration>(_onUpdateWarrantyDuration);
  }

  Future<void> _onInitiateVirtualAccount(InitiateVirtualAccount event, Emitter<InvoiceState> emit) async {
    emit(state.copyWith(isGeneratingAccount: true, error: null, paymentIntent: null));
    try {
      final intent = await repository.initiateVirtualAccount(
        amount: event.amount,
        customerName: event.customerName,
        customerPhone: event.customerPhone,
        email: event.email,
      );
      emit(state.copyWith(isGeneratingAccount: false, paymentIntent: intent));
    } catch (e) {
      emit(state.copyWith(isGeneratingAccount: false, error: friendlyApiError(e, fallback: 'Could not generate account.')));
    }
  }

  void _onAddItem(AddItemToInvoice event, Emitter<InvoiceState> emit) {
    final updatedItems = List<InvoiceItem>.from(state.items);
    
    // Find existing item with same ID AND matching service booking dates
    final existingIndex = updatedItems.indexWhere((i) {
      if (i.item.id != event.item.id) return false;
      if (i.serviceMeta == event.serviceMeta) return true;
      if (i.serviceMeta == null || event.serviceMeta == null) return false;
      try {
        final Map<String, dynamic> map1 = jsonDecode(i.serviceMeta!);
        final Map<String, dynamic> map2 = jsonDecode(event.serviceMeta!);
        return map1['startDate'] == map2['startDate'] && 
               map1['endDate'] == map2['endDate'];
      } catch (_) {
        return false;
      }
    });

    if (existingIndex >= 0) {
      final existingItem = updatedItems[existingIndex];
      final newQuantity = existingItem.quantity + event.quantity;
      if (newQuantity <= 0) {
        updatedItems.removeAt(existingIndex);
      } else {
        var newServiceMeta = existingItem.serviceMeta;
        if (newServiceMeta != null) {
          try {
            final Map<String, dynamic> map = jsonDecode(newServiceMeta);
            map['quantity'] = newQuantity;
            map['total'] = newQuantity * existingItem.unitPrice;
            newServiceMeta = jsonEncode(map);
          } catch (_) {}
        }
        updatedItems[existingIndex] = existingItem.copyWith(
          quantity: newQuantity,
          serviceMeta: newServiceMeta,
        );
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

    _emitUpdatedState(updatedItems, state.discount, state.discountType, emit);
  }

  void _onRemoveItem(RemoveItemFromInvoice event, Emitter<InvoiceState> emit) {
    final updatedItems = state.items.where((i) => i.item.id != event.item.id).toList();
    _emitUpdatedState(updatedItems, state.discount, state.discountType, emit);
  }

  void _onUpdateDiscount(UpdateDiscount event, Emitter<InvoiceState> emit) {
    _emitUpdatedState(state.items, event.discount, event.type, emit);
  }

  void _onUpdateItemPrintPrice(UpdateItemPrintPrice event, Emitter<InvoiceState> emit) {
    final updatedItems = state.items.map((item) {
      if (item.item.id == event.itemId) {
        return item.copyWith(printPrice: event.printPrice);
      }
      return item;
    }).toList();
    _emitUpdatedState(updatedItems, state.discount, state.discountType, emit);
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
        if (state.paymentMethod == 'Transfer' || state.paymentMethod == 'VirtualAccount') {
          status = 'Pending';
        } else if (amountPaid <= 0) {
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
        state.discountType,
      );

      final discountAmount = calculationService.calculateDiscountAmount(
        state.subtotal, 
        state.tax, 
        state.discount, 
        state.discountType,
      );

      final invoice = Invoice(
        invoiceNumber: event.invoiceNumber ?? calculationService.generateInvoiceNumber(),
        dateCreated: DateTime.now(),
        items: state.items,
        subtotal: state.subtotal,
        taxAmount: state.tax,
        discountAmount: discountAmount,
        discountType: state.discountType,
        totalAmount: state.total,
        paymentStatus: status,
        amountPaid: amountPaid,
        balanceAmount: balance,
        customerName: state.customerName,
        customerId: state.customerId,
        customerPhone: state.customerPhone,
        customerAddress: state.customerAddress,
        paymentMethod: state.paymentMethod,
        staffId: state.staffId,
        staffName: state.staffName,
        totalPrintAmount: totalPrintAmount,
        businessMode: state.businessMode,
        studentId: state.studentId,
        classId: state.classId,
        termId: state.termId,
        academicYearId: state.academicYearId,
        admissionNumber: state.admissionNumber,
        className: state.className,
        termName: state.termName,
        academicYearName: state.academicYearName,
        studentImage: state.studentImage,
        warrantyDuration: state.warrantyDuration,
        changeGiven: event.changeGiven ?? 0.0,
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
    emit(InvoiceState(
      items: state.items,
      subtotal: state.subtotal,
      tax: state.tax,
      discount: state.discount,
      discountType: state.discountType,
      total: state.total,
      isSaving: state.isSaving,
      isSaved: state.isSaved,
      error: state.error,
      taxRate: state.taxRate,
      taxEnabled: state.taxEnabled,
      discountEnabled: state.discountEnabled,
      isGeneratingAccount: state.isGeneratingAccount,
      paymentIntent: state.paymentIntent,
      customerName: event.name,
      customerId: event.customerId,
      customerPhone: event.phone,
      customerAddress: event.address,
      paymentMethod: state.paymentMethod,
      staffId: state.staffId,
      staffName: state.staffName,
      businessMode: state.businessMode,
      studentId: event.clearSchoolLink ? null : state.studentId,
      classId: event.clearSchoolLink ? null : state.classId,
      termId: state.termId,
      academicYearId: state.academicYearId,
      admissionNumber: event.clearSchoolLink ? null : state.admissionNumber,
      className: event.clearSchoolLink ? null : state.className,
      termName: state.termName,
      academicYearName: state.academicYearName,
      studentImage: event.clearSchoolLink ? null : state.studentImage,
      paymentSuccess: state.paymentSuccess,
      warrantyDuration: state.warrantyDuration,
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
    _emitUpdatedState(state.items, currentDiscount, state.discountType, emit);
  }

  void _emitUpdatedState(List<InvoiceItem> items, double discount, DiscountType discountType, Emitter<InvoiceState> emit) {
    final subtotal = calculationService.calculateSubtotal(items);
    final tax = calculationService.calculateTax(subtotal, state.taxRate, state.taxEnabled);
    final total = calculationService.calculateTotal(subtotal, tax, discount, discountType);

    emit(state.copyWith(
      items: items,
      subtotal: subtotal,
      tax: tax,
      discount: discount,
      discountType: discountType,
      total: total,
      isSaved: false,
    ));
  }

  void _onUpdateSchool(UpdateSchoolInfo event, Emitter<InvoiceState> emit) {
    emit(state.copyWith(
      studentId: event.studentId,
      classId: event.classId,
      termId: event.termId,
      academicYearId: event.academicYearId,
      admissionNumber: event.admissionNumber,
      className: event.className,
      termName: event.termName,
      academicYearName: event.academicYearName,
      studentImage: event.studentImage,
    ));
  }

  void _onUpdateBusinessMode(UpdateBusinessMode event, Emitter<InvoiceState> emit) {
    emit(state.copyWith(businessMode: event.businessMode));
  }

  void _onUpdateWarrantyDuration(UpdateWarrantyDuration event, Emitter<InvoiceState> emit) {
    emit(state.copyWith(warrantyDuration: event.warrantyDuration));
  }
}
