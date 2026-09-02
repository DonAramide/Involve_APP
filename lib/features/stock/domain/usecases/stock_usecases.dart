import 'package:involve_app/features/stock/domain/entities/item.dart';
import 'package:involve_app/features/stock/domain/entities/expense.dart';
import 'package:involve_app/features/stock/domain/repositories/item_repository.dart';
import '../entities/category.dart';
import '../repositories/category_repository.dart';

class GetItems {
  final ItemRepository repository;
  GetItems(this.repository);
  Future<List<Item>> call({String? businessMode}) => repository.getAllItems(businessMode: businessMode);
}

class AddItem {
  final ItemRepository repository;
  AddItem(this.repository);
  Future<void> call(Item item) => repository.addItem(item);
}

class UpdateItem {
  final ItemRepository repository;
  UpdateItem(this.repository);
  Future<void> call(Item item) => repository.updateItem(item);
}


class DeleteItem {
  final ItemRepository repository;
  DeleteItem(this.repository);
  Future<void> call(int id) => repository.deleteItem(id);
}

class IncreaseStock {
  final ItemRepository repository;
  IncreaseStock(this.repository);
  Future<void> call(
    int itemId,
    int quantity,
    String? remarks, {
    String? supplierName,
    String? receiptNumber,
    String? trackingNumber,
    DateTime? receivedAt,
    List<int>? receiptImage,
  }) =>
      repository.increaseStock(
        itemId,
        quantity,
        remarks,
        supplierName: supplierName,
        receiptNumber: receiptNumber,
        trackingNumber: trackingNumber,
        receivedAt: receivedAt,
        receiptImage: receiptImage,
      );
}

class GetStockHistory {
  final ItemRepository repository;
  GetStockHistory(this.repository);
  Future<List<StockHistoryEntry>> call(int itemId) => repository.getStockHistory(itemId);
}
class GetInventoryReport {
  final ItemRepository repository;
  GetInventoryReport(this.repository);
  Future<List<Map<String, dynamic>>> call({DateTime? start, DateTime? end, String? businessMode}) => 
    repository.getInventoryReport(start: start, end: end, businessMode: businessMode);
}

class GetProfitReport {
  final ItemRepository repository;
  GetProfitReport(this.repository);
  Future<List<Map<String, dynamic>>> call({DateTime? start, DateTime? end, String? businessMode}) => 
    repository.getProfitReport(start: start, end: end, businessMode: businessMode);
}

class AddExpense {
  final ItemRepository repository;
  AddExpense(this.repository);
  Future<void> call(Expense expense) => repository.addExpense(expense);
}

class GetExpenses {
  final ItemRepository repository;
  GetExpenses(this.repository);
  Future<List<Expense>> call({DateTime? start, DateTime? end, String? businessMode}) => 
    repository.getExpenses(start: start, end: end, businessMode: businessMode);
}

class GetTotalExpenses {
  final ItemRepository repository;
  GetTotalExpenses(this.repository);
  Future<double> call({DateTime? start, DateTime? end, String? businessMode}) => 
    repository.getTotalExpenses(start: start, end: end, businessMode: businessMode);
}

// Category Use Cases
class GetCategories {
  final CategoryRepository repository;
  GetCategories(this.repository);
  Future<List<Category>> call({String? businessMode}) => repository.getCategories(businessMode: businessMode);
}

class AddNewCategory {
  final CategoryRepository repository;
  AddNewCategory(this.repository);
  Future<void> call(String name, {String? businessMode}) => repository.addCategory(name, businessMode: businessMode);
}

class DeleteCategoryUseCase {
  final CategoryRepository repository;
  DeleteCategoryUseCase(this.repository);
  Future<void> call(int id) => repository.deleteCategory(id);
}
