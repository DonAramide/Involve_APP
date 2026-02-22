import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import '../models/item_table.dart';
import '../../domain/entities/item.dart';
import '../../domain/repositories/item_repository.dart';

class ItemRepositoryImpl implements ItemRepository {
  final AppDatabase db;

  ItemRepositoryImpl(this.db);

  @override
  Future<List<Item>> getAllItems() async {
    final results = await db.select(db.items).get();
    return results.map((row) => _toEntity(row)).toList();
  }

  @override
  Future<void> addItem(Item item) async {
    final now = DateTime.now();
    await db.into(db.items).insert(
          ItemsCompanion.insert(
            name: item.name,
            category: item.category.name,
            categoryId: Value(item.categoryId),
            price: item.price,
            stockQty: Value(item.stockQty),
            image: Value(item.image),
            type: Value(item.type),
            billingType: Value(item.billingType),
            serviceCategory: Value(item.serviceCategory),
            requiresTimeTracking: Value(item.requiresTimeTracking),
            minStockQty: Value(item.minStockQty),
            syncId: Value(item.syncId ?? const Uuid().v4()),
            updatedAt: Value(now),
            createdAt: Value(now),
            isDeleted: const Value(false),
          ),
        );
  }

  @override
  Future<void> updateItem(Item item) async {
    await (db.update(db.items)..where((t) => t.id.equals(item.id!))).write(
          ItemsCompanion(
            name: Value(item.name),
            category: Value(item.category.name),
            categoryId: Value(item.categoryId),
            price: Value(item.price),
            stockQty: Value(item.stockQty),
            minStockQty: Value(item.minStockQty),
            image: Value(item.image),
            type: Value(item.type),
            billingType: Value(item.billingType),
            serviceCategory: Value(item.serviceCategory),
            requiresTimeTracking: Value(item.requiresTimeTracking),
            updatedAt: Value(DateTime.now()),
            isDeleted: const Value(false),
          ),
        );
  }

  @override
  Future<void> deleteItem(int id) async {
    // Soft delete for sync
    await (db.update(db.items)..where((t) => t.id.equals(id))).write(
          ItemsCompanion(
            isDeleted: const Value(true),
            updatedAt: Value(DateTime.now()),
          ),
        );
  }

  @override
  Future<void> increaseStock(int itemId, int quantity, String? remarks) async {
    final now = DateTime.now();
    final syncId = 'STK-${now.millisecondsSinceEpoch}';

    await db.transaction(() async {
      // 1. Get current stock qty
      final item = await (db.select(db.items)..where((t) => t.id.equals(itemId))).getSingle();
      final before = item.stockQty;
      final after = before + quantity;

      // 2. Update items table
      await db.customStatement(
        'UPDATE items SET stock_qty = ?, updated_at = ? WHERE id = ?',
        [after, now.millisecondsSinceEpoch, itemId],
      );

      // 3. Insert into stock_increments table
      await db.into(db.stockIncrements).insert(
            StockIncrementsCompanion.insert(
              itemId: itemId,
              quantityAdded: quantity,
              quantityBefore: Value(before),
              quantityAfter: Value(after),
              remarks: Value(remarks),
              dateAdded: Value(now),
              syncId: Value(syncId),
              updatedAt: Value(now),
              createdAt: Value(now),
            ),
          );
    });
  }

  @override
  Future<List<StockHistoryEntry>> getStockHistory(int itemId) async {
    final query = db.select(db.stockIncrements)..where((t) => t.itemId.equals(itemId))..orderBy([(t) => OrderingTerm.desc(t.dateAdded)]);
    final rows = await query.get();
    return rows.map((row) => StockHistoryEntry(
      id: row.id,
      itemId: row.itemId,
      quantityAdded: row.quantityAdded,
      quantityBefore: row.quantityBefore,
      quantityAfter: row.quantityAfter,
      dateAdded: row.dateAdded,
      remarks: row.remarks,
    )).toList();
  }

  @override
  Future<List<Map<String, dynamic>>> getInventoryReport({DateTime? start, DateTime? end}) async {
    final summedQuantity = db.invoiceItems.quantity.sum();
    final query = db.select(db.items).join([
      leftOuterJoin(
        db.invoiceItems,
        db.invoiceItems.itemId.equalsExp(db.items.id),
        useColumns: false,
      ),
      leftOuterJoin(
        db.invoices,
        db.invoices.id.equalsExp(db.invoiceItems.invoiceId),
        useColumns: false,
      ),
    ]);

    if (start != null) {
      query.where(db.invoices.dateCreated.isBiggerOrEqualValue(start));
    }
    if (end != null) {
      query.where(db.invoices.dateCreated.isSmallerOrEqualValue(end));
    }

    query.addColumns([summedQuantity]);
    query.groupBy([db.items.id]);

    final results = await query.get();

    return results.map((row) {
      final item = row.readTable(db.items);
      final totalSold = row.read(summedQuantity) ?? 0;

      return {
        'id': item.id,
        'name': item.name,
        'price': item.price,
        'stockQty': item.stockQty,
        'totalSold': totalSold,
        'totalRevenue': totalSold * item.price,
      };
    }).toList();
  }

  Item _toEntity(ItemTable row) {
    return Item(
      id: row.id,
      name: row.name,
      category: ItemCategory.values.byName(row.category),
      categoryId: row.categoryId,
      price: row.price,
      stockQty: row.stockQty,
      minStockQty: row.minStockQty,
      image: row.image,
      type: row.type,
      billingType: row.billingType,
      serviceCategory: row.serviceCategory,
      requiresTimeTracking: row.requiresTimeTracking,
      syncId: row.syncId,
    );
  }
}
