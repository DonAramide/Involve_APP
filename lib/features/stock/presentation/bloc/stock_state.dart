import 'package:equatable/equatable.dart';
import '../../domain/entities/item.dart';
import '../../domain/entities/category.dart';

// Events
abstract class StockEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadItems extends StockEvent {}

class AddStockItem extends StockEvent {
  final Item item;
  AddStockItem(this.item);
  @override
  List<Object?> get props => [item];
}

class UpdateStockItem extends StockEvent {
  final Item item;
  UpdateStockItem(this.item);
  @override
  List<Object?> get props => [item];
}

class DeleteStockItem extends StockEvent {
  final int id;
  DeleteStockItem(this.id);
  @override
  List<Object?> get props => [id];
}

// Category Events
class LoadCategories extends StockEvent {}

class AddCategory extends StockEvent {
  final String name;
  AddCategory(this.name);
  @override
  List<Object?> get props => [name];
}

class DeleteCategory extends StockEvent {
  final int id;
  DeleteCategory(this.id);
  @override
  List<Object?> get props => [id];
}

// States
abstract class StockState extends Equatable {
  @override
  List<Object?> get props => [];
}

class StockInitial extends StockState {}

class StockLoading extends StockState {}

class StockLoaded extends StockState {
  final List<Item> items;
  final List<Category> categories;

  StockLoaded(this.items, {this.categories = const []});
  
  StockLoaded copyWith({List<Item>? items, List<Category>? categories}) {
    return StockLoaded(
      items ?? this.items,
      categories: categories ?? this.categories,
    );
  }

  @override
  List<Object?> get props => [items, categories];
}

class StockError extends StockState {
  final String message;
  StockError(this.message);
  @override
  List<Object?> get props => [message];
}
