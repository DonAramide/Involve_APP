import '../entities/item.dart';
import '../entities/expense.dart';

abstract class ItemRepository {
  Future<List<Item>> getAllItems();
  Future<void> addItem(Item item);
  Future<void> updateItem(Item item);
  Future<void> deleteItem(int id);
  Future<void> increaseStock(int itemId, int quantity, String? remarks);
  Future<List<StockHistoryEntry>> getStockHistory(int itemId);
  Future<List<Map<String, dynamic>>> getInventoryReport({DateTime? start, DateTime? end});
  Future<List<Map<String, dynamic>>> getProfitReport({DateTime? start, DateTime? end});
  
  // Expenses
  Future<void> addExpense(Expense expense);
  Future<List<Expense>> getExpenses({DateTime? start, DateTime? end});
  Future<double> getTotalExpenses({DateTime? start, DateTime? end});
}
