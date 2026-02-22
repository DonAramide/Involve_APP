import '../entities/item.dart';

abstract class ItemRepository {
  Future<List<Item>> getAllItems();
  Future<void> addItem(Item item);
  Future<void> updateItem(Item item);
  Future<void> deleteItem(int id);
  Future<void> increaseStock(int itemId, int quantity, String? remarks);
  Future<List<StockHistoryEntry>> getStockHistory(int itemId);
  Future<List<Map<String, dynamic>>> getInventoryReport({DateTime? start, DateTime? end});
}
