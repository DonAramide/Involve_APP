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
  final ItemCategory category; // Kept for backward compatibility/type grouping
  final int? categoryId; // Link to dynamic Category
  final double price;
  final int stockQty;
  final Uint8List? image;

  const Item({
    this.id,
    required this.name,
    required this.category,
    this.categoryId,
    required this.price,
    required this.stockQty,
    this.image,
  });

  Item copyWith({
    int? id,
    String? name,
    ItemCategory? category,
    int? categoryId,
    double? price,
    int? stockQty,
    Uint8List? image,
  }) {
    return Item(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      categoryId: categoryId ?? this.categoryId,
      price: price ?? this.price,
      stockQty: stockQty ?? this.stockQty,
      image: image ?? this.image,
    );
  }

  @override
  List<Object?> get props => [id, name, category, categoryId, price, stockQty, image];
}
