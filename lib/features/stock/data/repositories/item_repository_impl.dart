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

  Item _toEntity(ItemTable row) {
    return Item(
      id: row.id,
      name: row.name,
      category: ItemCategory.values.byName(row.category),
      categoryId: row.categoryId,
      price: row.price,
      stockQty: row.stockQty,
      image: row.image,
      type: row.type,
      billingType: row.billingType,
      serviceCategory: row.serviceCategory,
      requiresTimeTracking: row.requiresTimeTracking,
      syncId: row.syncId,
    );
  }
}
