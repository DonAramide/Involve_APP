import 'dart:typed_data';
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

class UpdateItemPrintPrice extends InvoiceEvent {
  final int itemId;
  final double? printPrice;
  UpdateItemPrintPrice(this.itemId, this.printPrice);
  @override
  List<Object?> get props => [itemId, printPrice];
}

class UpdateDiscount extends InvoiceEvent {
  final double discount;
  final DiscountType type;
  UpdateDiscount(this.discount, {this.type = DiscountType.amount});
  @override
  List<Object?> get props => [discount, type];
}

class UpdateCustomerInfo extends InvoiceEvent {
  final String? name;
  final String? phone;
  final String? address;
  UpdateCustomerInfo({this.name, this.phone, this.address});
  @override
  List<Object?> get props => [name, phone, address];
}

class UpdatePaymentMethod extends InvoiceEvent {
  final String? paymentMethod;
  UpdatePaymentMethod(this.paymentMethod);
  @override
  List<Object?> get props => [paymentMethod];
}

class UpdateStaffInfo extends InvoiceEvent {
  final int? staffId;
  final String? staffName;
  UpdateStaffInfo({this.staffId, this.staffName});
  @override
  List<Object?> get props => [staffId, staffName];
}

class UpdateSchoolInfo extends InvoiceEvent {
  final int? studentId;
  final int? classId;
  final int? termId;
  final int? academicYearId;
  final String? admissionNumber;
  final String? className;
  final String? termName;
  final String? academicYearName;
  final Uint8List? studentImage;

  UpdateSchoolInfo({
    this.studentId, 
    this.classId, 
    this.termId, 
    this.academicYearId,
    this.admissionNumber,
    this.className,
    this.termName,
    this.academicYearName,
    this.studentImage,
  });
  
  @override
  List<Object?> get props => [
    studentId, classId, termId, academicYearId, 
    admissionNumber, className, termName, academicYearName, studentImage
  ];
}

class UpdateBusinessMode extends InvoiceEvent {
  final String businessMode;
  UpdateBusinessMode(this.businessMode);
  @override
  List<Object?> get props => [businessMode];
}

class SaveInvoice extends InvoiceEvent {
  final String? invoiceNumber;
  final double? amountPaid;
  final String? paymentStatus;
  SaveInvoice({this.invoiceNumber, this.amountPaid, this.paymentStatus});
  @override
  List<Object?> get props => [invoiceNumber, amountPaid, paymentStatus];
}

class UpdateSelectedBank extends InvoiceEvent {
  final int index;
  UpdateSelectedBank(this.index);
  @override
  List<Object?> get props => [index];
}

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
  final DiscountType discountType;
  final double total;
  final bool isSaving;
  final bool isSaved;
  final String? error;
  final double taxRate;
  final bool taxEnabled;
  final bool discountEnabled;
  final String? customerName;
  final String? customerPhone;
  final String? customerAddress;
  final String? paymentMethod;
  final int? staffId;
  final String? staffName;
  final String businessMode;
  final int? studentId;
  final int? classId;
  final int? termId;
  final int? academicYearId;
  final String? admissionNumber;
  final String? className;
  final String? termName;
  final String? academicYearName;
  final Uint8List? studentImage;
  final int selectedBankIndex; // 0 or 1

  const InvoiceState({
    this.items = const [],
    this.subtotal = 0,
    this.tax = 0,
    this.discount = 0,
    this.discountType = DiscountType.amount,
    this.total = 0,
    this.isSaving = false,
    this.isSaved = false,
    this.error,
    this.taxRate = 0.0,
    this.taxEnabled = true,
    this.discountEnabled = true,
    this.customerName,
    this.customerPhone,
    this.customerAddress,
    this.paymentMethod,
    this.staffId,
    this.staffName,
    this.businessMode = 'retail',
    this.studentId,
    this.classId,
    this.termId,
    this.academicYearId,
    this.admissionNumber,
    this.className,
    this.termName,
    this.academicYearName,
    this.studentImage,
    this.selectedBankIndex = 0,
  });

  InvoiceState copyWith({
    List<InvoiceItem>? items,
    double? subtotal,
    double? tax,
    double? discount,
    DiscountType? discountType,
    double? total,
    bool? isSaving,
    bool? isSaved,
    String? error,
    double? taxRate,
    bool? taxEnabled,
    bool? discountEnabled,
    String? customerName,
    String? customerPhone,
    String? customerAddress,
    String? paymentMethod,
    int? staffId,
    String? staffName,
    String? businessMode,
    int? studentId,
    int? classId,
    int? termId,
    int? academicYearId,
    String? admissionNumber,
    String? className,
    String? termName,
    String? academicYearName,
    Uint8List? studentImage,
    int? selectedBankIndex,
  }) {
    return InvoiceState(
      items: items ?? this.items,
      subtotal: subtotal ?? this.subtotal,
      tax: tax ?? this.tax,
      discount: discount ?? this.discount,
      discountType: discountType ?? this.discountType,
      total: total ?? this.total,
      isSaving: isSaving ?? this.isSaving,
      isSaved: isSaved ?? this.isSaved,
      error: error ?? this.error,
      taxRate: taxRate ?? this.taxRate,
      taxEnabled: taxEnabled ?? this.taxEnabled,
      discountEnabled: discountEnabled ?? this.discountEnabled,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      customerAddress: customerAddress ?? this.customerAddress,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      staffId: staffId ?? this.staffId,
      staffName: staffName ?? this.staffName,
      businessMode: businessMode ?? this.businessMode,
      studentId: studentId ?? this.studentId,
      classId: classId ?? this.classId,
      termId: termId ?? this.termId,
      academicYearId: academicYearId ?? this.academicYearId,
      admissionNumber: admissionNumber ?? this.admissionNumber,
      className: className ?? this.className,
      termName: termName ?? this.termName,
      academicYearName: academicYearName ?? this.academicYearName,
      studentImage: studentImage ?? this.studentImage,
      selectedBankIndex: selectedBankIndex ?? this.selectedBankIndex,
    );
  }

  @override
  List<Object?> get props => [
        items,
        subtotal,
        tax,
        discount,
        discountType,
        total,
        isSaving,
        isSaved,
        error,
        taxRate,
        taxEnabled,
        discountEnabled,
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod,
        staffId,
        staffName,
        businessMode,
        studentId,
        classId,
        termId,
        academicYearId,
        admissionNumber,
        className,
        termName,
        academicYearName,
        studentImage,
        selectedBankIndex,
      ];
}
