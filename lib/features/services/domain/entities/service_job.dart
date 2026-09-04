import 'dart:typed_data';
import 'package:equatable/equatable.dart';

class ServiceJob extends Equatable {
  final String id;
  final String jobId;
  final String customerId;
  final String? customerName; // Added for display
  final String title;
  final String? description;
  final double totalAmount;
  final double amountPaid;
  final double laborAmount; // Workmanship fee
  final double balance;
  final String status;
  final List<ServiceJobItem> items; // Breakdown of materials
  final DateTime? dueDate;
  final Uint8List? image;
  final DateTime createdAt;
  final String? warrantyDuration;
  final int? staffId;
  final String? staffName;

  const ServiceJob({
    required this.id,
    required this.jobId,
    required this.customerId,
    this.customerName,
    required this.title,
    this.description,
    required this.totalAmount,
    required this.amountPaid,
    this.laborAmount = 0.0,
    required this.balance,
    required this.status,
    this.items = const [],
    this.dueDate,
    this.image,
    required this.createdAt,
    this.warrantyDuration,
    this.staffId,
    this.staffName,
  });

  ServiceJob copyWith({
    String? id,
    String? jobId,
    String? customerId,
    String? customerName,
    String? title,
    String? description,
    double? totalAmount,
    double? amountPaid,
    double? laborAmount,
    double? balance,
    String? status,
    List<ServiceJobItem>? items,
    DateTime? dueDate,
    Uint8List? image,
    DateTime? createdAt,
    String? warrantyDuration,
    int? staffId,
    String? staffName,
  }) {
    return ServiceJob(
      id: id ?? this.id,
      jobId: jobId ?? this.jobId,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      title: title ?? this.title,
      description: description ?? this.description,
      totalAmount: totalAmount ?? this.totalAmount,
      amountPaid: amountPaid ?? this.amountPaid,
      laborAmount: laborAmount ?? this.laborAmount,
      balance: balance ?? this.balance,
      status: status ?? this.status,
      items: items ?? this.items,
      dueDate: dueDate ?? this.dueDate,
      image: image ?? this.image,
      createdAt: createdAt ?? this.createdAt,
      warrantyDuration: warrantyDuration ?? this.warrantyDuration,
      staffId: staffId ?? this.staffId,
      staffName: staffName ?? this.staffName,
    );
  }

  @override
  List<Object?> get props => [
        id,
        jobId,
        customerId,
        customerName,
        title,
        description,
        totalAmount,
        amountPaid,
        laborAmount,
        balance,
        status,
        items,
        dueDate,
        image,
        createdAt,
        warrantyDuration,
        staffId,
        staffName,
      ];
}

class ServiceJobItem extends Equatable {
  final int? id; // Null for new items, populated for existing
  final String name;
  final String? category;
  final double price;
  final double quantity;

  const ServiceJobItem({
    this.id,
    required this.name,
    this.category,
    required this.price,
    this.quantity = 1.0,
  });

  @override
  List<Object?> get props => [id, name, category, price, quantity];
}
