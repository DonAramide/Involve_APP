import 'package:equatable/equatable.dart';
import 'dart:typed_data';
import '../../../stock/domain/entities/item.dart';

class InvoiceItem extends Equatable {
  final int? id;
  final Item item;
  final int quantity;
  final double unitPrice;

  final String type; // 'product' | 'service'
  final String? serviceMeta; // JSON snapshot
  final String? syncId;
  final double? printPrice;
  final int returnedQuantity;
  final bool isReplacement;

  const InvoiceItem({
    this.id,
    required this.item,
    required this.quantity,
    required this.unitPrice,
    this.type = 'product',
    this.serviceMeta,
    this.syncId,
    this.printPrice,
    this.returnedQuantity = 0,
    this.isReplacement = false,
  });

  double get total => quantity * unitPrice;
  double get totalPrint => quantity * (printPrice ?? unitPrice);

  InvoiceItem copyWith({
    int? id,
    Item? item,
    int? quantity,
    double? unitPrice,
    String? type,
    String? serviceMeta,
    String? syncId,
    double? printPrice,
    int? returnedQuantity,
  }) {
    return InvoiceItem(
      id: id ?? this.id,
      item: item ?? this.item,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      type: type ?? this.type,
      serviceMeta: serviceMeta ?? this.serviceMeta,
      syncId: syncId ?? this.syncId,
      printPrice: printPrice ?? this.printPrice,
      returnedQuantity: returnedQuantity ?? this.returnedQuantity,
      isReplacement: isReplacement ?? this.isReplacement,
    );
  }

  @override
  List<Object?> get props => [id, item, quantity, unitPrice, type, serviceMeta, syncId, printPrice, returnedQuantity, isReplacement];
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
  final double amountPaid;
  final double balanceAmount;
  final String? customerName;
  final String? customerPhone;
  final String? customerAddress;
  final String? paymentMethod; // 'Cash', 'POS', 'Transfer'
  final int? staffId;
  final String? staffName;
  final String? syncId;
  final double? totalPrintAmount;
  
  // school fields
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
  final DateTime? dueDate;

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
    this.amountPaid = 0.0,
    this.balanceAmount = 0.0,
    this.customerName,
    this.customerPhone,
    this.customerAddress,
    this.paymentMethod,
    this.staffId,
    this.staffName,
    this.syncId,
    this.totalPrintAmount,
    // school fields
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
    this.dueDate,
  });

  Invoice copyWith({
    int? id,
    String? invoiceNumber,
    DateTime? dateCreated,
    List<InvoiceItem>? items,
    double? subtotal,
    double? taxAmount,
    double? discountAmount,
    double? totalAmount,
    String? paymentStatus,
    double? amountPaid,
    double? balanceAmount,
    String? customerName,
    String? customerPhone,
    String? customerAddress,
    String? paymentMethod,
    int? staffId,
    String? staffName,
    String? syncId,
    double? totalPrintAmount,
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
    DateTime? dueDate,
  }) {
    return Invoice(
      id: id ?? this.id,
      invoiceNumber: invoiceNumber ?? this.invoiceNumber,
      dateCreated: dateCreated ?? this.dateCreated,
      items: items ?? this.items,
      subtotal: subtotal ?? this.subtotal,
      taxAmount: taxAmount ?? this.taxAmount,
      discountAmount: discountAmount ?? this.discountAmount,
      totalAmount: totalAmount ?? this.totalAmount,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      amountPaid: amountPaid ?? this.amountPaid,
      balanceAmount: balanceAmount ?? this.balanceAmount,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      customerAddress: customerAddress ?? this.customerAddress,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      staffId: staffId ?? this.staffId,
      staffName: staffName ?? this.staffName,
      syncId: syncId ?? this.syncId,
      totalPrintAmount: totalPrintAmount ?? this.totalPrintAmount,
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
      dueDate: dueDate ?? this.dueDate,
    );
  }

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
        amountPaid,
        balanceAmount,
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod,
        staffId,
        staffName,
        syncId,
        totalPrintAmount,
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
        dueDate,
      ];
}
