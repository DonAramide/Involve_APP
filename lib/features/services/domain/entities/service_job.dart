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
  });

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
