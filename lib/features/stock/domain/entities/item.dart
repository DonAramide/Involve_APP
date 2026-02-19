import 'package:equatable/equatable.dart';
import 'dart:typed_data';

enum ItemCategory {
  drink,
  food,
  room,
  service,
}

class Item extends Equatable {
  final int? id;
  final String name;
  final ItemCategory category;
  final int? categoryId;
  final double price;
  final int stockQty;
  final Uint8List? image;
  final String type; // 'product' | 'service'
  final String? billingType;
  final String? serviceCategory;
  final bool requiresTimeTracking;

  const Item({
    this.id,
    required this.name,
    required this.category,
    this.categoryId,
    required this.price,
    required this.stockQty,
    this.image,
    this.type = 'product',
    this.billingType,
    this.serviceCategory,
    this.requiresTimeTracking = false,
  });

  Item copyWith({
    int? id,
    String? name,
    ItemCategory? category,
    int? categoryId,
    double? price,
    int? stockQty,
    Uint8List? image,
    String? type,
    String? billingType,
    String? serviceCategory,
    bool? requiresTimeTracking,
  }) {
    return Item(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      categoryId: categoryId ?? this.categoryId,
      price: price ?? this.price,
      stockQty: stockQty ?? this.stockQty,
      image: image ?? this.image,
      type: type ?? this.type,
      billingType: billingType ?? this.billingType,
      serviceCategory: serviceCategory ?? this.serviceCategory,
      requiresTimeTracking: requiresTimeTracking ?? this.requiresTimeTracking,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        category,
        categoryId,
        price,
        stockQty,
        image,
        type,
        billingType,
        serviceCategory,
        requiresTimeTracking
      ];
}
