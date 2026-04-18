import 'dart:typed_data';
import 'package:equatable/equatable.dart';
import '../../domain/entities/item.dart';
import '../../domain/entities/category.dart';
import '../../domain/entities/expense.dart';

// Events
abstract class StockEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadItems extends StockEvent {
  final String? businessMode;
  LoadItems({this.businessMode});
  @override
  List<Object?> get props => [businessMode];
}

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
  final String? supplierName;
  final Uint8List? supplyInvoiceImage;

  StockIncrementRequested(
    this.itemId,
    this.quantity, {
    this.remarks,
    this.supplierName,
    this.supplyInvoiceImage,
  });

  @override
  List<Object?> get props => [itemId, quantity, remarks, supplierName, supplyInvoiceImage];
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
  final String? businessMode;
  LoadInventoryReportRequested({this.start, this.end, this.businessMode});
  @override
  List<Object?> get props => [start, end, businessMode];
}

class LoadProfitReportRequested extends StockEvent {
  final DateTime? start;
  final DateTime? end;
  final String? businessMode;
  LoadProfitReportRequested({this.start, this.end, this.businessMode});
  @override
  List<Object?> get props => [start, end, businessMode];
}

class AddExpenseRequested extends StockEvent {
  final Expense expense;
  AddExpenseRequested(this.expense);
  @override
  List<Object?> get props => [expense];
}

class LoadExpensesRequested extends StockEvent {
  final DateTime? start;
  final DateTime? end;
  final String? businessMode;
  LoadExpensesRequested({this.start, this.end, this.businessMode});
  @override
  List<Object?> get props => [start, end, businessMode];
}

// Category Events
class LoadCategories extends StockEvent {
  final String? businessMode;
  LoadCategories({this.businessMode});
  @override
  List<Object?> get props => [businessMode];
}

class AddCategory extends StockEvent {
  final String name;
  final String? businessMode;
  AddCategory(this.name, {this.businessMode});
  @override
  List<Object?> get props => [name, businessMode];
}

class DeleteCategory extends StockEvent {
  final int id;
  DeleteCategory(this.id);
  @override
  List<Object?> get props => [id];
}

class ToggleItemDefaultEvent extends StockEvent {
  final Item item;
  ToggleItemDefaultEvent(this.item);
  @override
  List<Object?> get props => [item];
}

class ResetStockStatus extends StockEvent {}

// States
enum StockStatus { initial, loading, success, failure }

abstract class StockState extends Equatable {
  final List<Item> items;
  final List<Category> categories;
  final String? businessMode;
  final StockStatus status;
  final String? error;

  const StockState({
    this.items = const [],
    this.categories = const [],
    this.businessMode,
    this.status = StockStatus.initial,
    this.error,
  });

  bool get isLoading => status == StockStatus.loading || this is StockLoading;

  @override
  List<Object?> get props => [items, categories, businessMode, status, error];
}

class StockInitial extends StockState {
  const StockInitial() : super();
}

class StockLoading extends StockState {
  const StockLoading({super.items, super.categories, super.businessMode}) : super(status: StockStatus.loading);
}

class StockLoaded extends StockState {
  const StockLoaded(List<Item> items, {List<Category> categories = const [], String? businessMode, StockStatus status = StockStatus.success, String? error})
      : super(items: items, categories: categories, businessMode: businessMode, status: status, error: error);

  StockLoaded copyWith({List<Item>? items, List<Category>? categories, String? businessMode, StockStatus? status, String? error}) {
    return StockLoaded(
      items ?? this.items,
      categories: categories ?? this.categories,
      businessMode: businessMode ?? this.businessMode,
      status: status ?? this.status,
      error: error ?? this.error,
    );
  }
}

class StockError extends StockState {
  final String message;
  const StockError(this.message, {super.items, super.categories, super.businessMode}) : super(status: StockStatus.failure, error: message);
  @override
  List<Object?> get props => [message, items, categories, businessMode, status, error];
}

class StockHistoryLoaded extends StockState {
  final List<StockHistoryEntry> history;
  const StockHistoryLoaded(this.history, {super.items, super.categories, super.businessMode}) : super(status: StockStatus.success);
  @override
  List<Object?> get props => [history, items, categories, businessMode, status, error];
}

class InventoryReportLoaded extends StockState {
  final List<Map<String, dynamic>> report;
  const InventoryReportLoaded(this.report, {super.items, super.categories, super.businessMode}) : super(status: StockStatus.success);
  @override
  List<Object?> get props => [report, items, categories, businessMode, status, error];
}

class ProfitReportLoaded extends StockState {
  final List<Map<String, dynamic>> report;
  final double totalExpenses;
  final List<Expense> expenses;
  const ProfitReportLoaded(this.report, this.totalExpenses, {this.expenses = const [], super.items, super.categories, super.businessMode}) : super(status: StockStatus.success);
  @override
  List<Object?> get props => [report, totalExpenses, expenses, items, categories, businessMode, status, error];
}

class ExpensesLoaded extends StockState {
  final List<Expense> expenses;
  const ExpensesLoaded(this.expenses, {super.items, super.categories, super.businessMode}) : super(status: StockStatus.success);
  @override
  List<Object?> get props => [expenses, items, categories, businessMode, status, error];
}
