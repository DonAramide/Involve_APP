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
  final double costPrice;
  final int stockQty;
  final double minStockQty;
  final Uint8List? image;
  final String type; // 'product' | 'service'
  final String? billingType;
  final String? serviceCategory;
  final bool requiresTimeTracking;
  final String businessMode;
  final String? syncId;
  final bool isDefault;

  const Item({
    this.id,
    required this.name,
    required this.category,
    this.categoryId,
    required this.price,
    this.costPrice = 0.0,
    required this.stockQty,
    this.minStockQty = 0,
    this.image,
    this.type = 'product',
    this.billingType,
    this.serviceCategory,
    this.requiresTimeTracking = false,
    this.businessMode = 'retail',
    this.syncId,
    this.isDefault = false,
  });

  Item copyWith({
    int? id,
    String? name,
    ItemCategory? category,
    int? categoryId,
    double? price,
    double? costPrice,
    int? stockQty,
    double? minStockQty,
    Uint8List? image,
    String? type,
    String? billingType,
    String? serviceCategory,
    bool? requiresTimeTracking,
    String? businessMode,
    String? syncId,
    bool? isDefault,
  }) {
    return Item(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      categoryId: categoryId ?? this.categoryId,
      price: price ?? this.price,
      costPrice: costPrice ?? this.costPrice,
      stockQty: stockQty ?? this.stockQty,
      minStockQty: minStockQty ?? this.minStockQty,
      image: image ?? this.image,
      type: type ?? this.type,
      billingType: billingType ?? this.billingType,
      serviceCategory: serviceCategory ?? this.serviceCategory,
      requiresTimeTracking: requiresTimeTracking ?? this.requiresTimeTracking,
      businessMode: businessMode ?? this.businessMode,
      syncId: syncId ?? this.syncId,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        category,
        categoryId,
        price,
        costPrice,
        stockQty,
        minStockQty,
        image,
        type,
        billingType,
        serviceCategory,
        requiresTimeTracking,
        businessMode,
        syncId,
        isDefault,
      ];
}

class StockHistoryEntry extends Equatable {
  final int? id;
  final int itemId;
  final int quantityAdded;
  final int quantityBefore;
  final int quantityAfter;
  final DateTime dateAdded;
  final String? remarks;
  final String? supplierName;
  final Uint8List? supplyInvoiceImage;

  const StockHistoryEntry({
    this.id,
    required this.itemId,
    required this.quantityAdded,
    required this.quantityBefore,
    required this.quantityAfter,
    required this.dateAdded,
    this.remarks,
    this.supplierName,
    this.supplyInvoiceImage,
  });

  @override
  List<Object?> get props => [
        id,
        itemId,
        quantityAdded,
        quantityBefore,
        quantityAfter,
        dateAdded,
        remarks,
        supplierName,
        supplyInvoiceImage,
      ];
}
