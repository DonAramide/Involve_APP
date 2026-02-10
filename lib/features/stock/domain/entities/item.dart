import 'package:equatable/equatable.dart';

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
  final double price;
  final int stockQty;

  const Item({
    this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.stockQty,
  });

  Item copyWith({
    int? id,
    String? name,
    ItemCategory? category,
    double? price,
    int? stockQty,
  }) {
    return Item(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      price: price ?? this.price,
      stockQty: stockQty ?? this.stockQty,
    );
  }

  @override
  List<Object?> get props => [id, name, category, price, stockQty];
}
