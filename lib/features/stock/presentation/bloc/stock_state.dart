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

class StockIncrementRequested extends StockEvent {
  final int itemId;
  final int quantity;
  final String? remarks;
  StockIncrementRequested(this.itemId, this.quantity, {this.remarks});
  @override
  List<Object?> get props => [itemId, quantity, remarks];
}

class LoadStockHistoryRequested extends StockEvent {
  final int itemId;
  LoadStockHistoryRequested(this.itemId);
  @override
  List<Object?> get props => [itemId];
}

class LoadInventoryReportRequested extends StockEvent {
  final DateTime? start;
  final DateTime? end;
  LoadInventoryReportRequested({this.start, this.end});
  @override
  List<Object?> get props => [start, end];
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
  final List<Item> items;
  final List<Category> categories;

  const StockState({this.items = const [], this.categories = const []});

  @override
  List<Object?> get props => [items, categories];
}

class StockInitial extends StockState {
  const StockInitial() : super();
}

class StockLoading extends StockState {
  const StockLoading({super.items, super.categories});
}

class StockLoaded extends StockState {
  const StockLoaded(List<Item> items, {List<Category> categories = const []})
      : super(items: items, categories: categories);

  StockLoaded copyWith({List<Item>? items, List<Category>? categories}) {
    return StockLoaded(
      items ?? this.items,
      categories: categories ?? this.categories,
    );
  }
}

class StockError extends StockState {
  final String message;
  const StockError(this.message, {super.items, super.categories});
  @override
  List<Object?> get props => [message, items, categories];
}

class StockHistoryLoaded extends StockState {
  final List<StockHistoryEntry> history;
  const StockHistoryLoaded(this.history, {super.items, super.categories});
  @override
  List<Object?> get props => [history, items, categories];
}

class InventoryReportLoaded extends StockState {
  final List<Map<String, dynamic>> report;
  const InventoryReportLoaded(this.report, {super.items, super.categories});
  @override
  List<Object?> get props => [report, items, categories];
}
