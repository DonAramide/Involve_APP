import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../models/category_table.dart';
import '../../domain/entities/category.dart';
import '../../domain/repositories/category_repository.dart';
import '../datasources/app_database.dart';
import 'package:involve_app/core/utils/device_info_service.dart';

class CategoryRepositoryImpl implements CategoryRepository {
  final AppDatabase db;
  final _uuid = const Uuid();

  CategoryRepositoryImpl(this.db);

  @override
  Future<List<Category>> getCategories({String? businessMode}) async {
    final query = db.select(db.categories)
      ..where((t) {
        final filters = [t.isDeleted.equals(false)];
        if (businessMode != null) {
          if (businessMode == 'school') {
            filters.add(t.businessMode.equals('school'));
          } else {
            // For retail, show explicitly retail or null
            filters.add(t.businessMode.equals('retail') | t.businessMode.isNull());
          }
        }
        return Expression.and(filters);
      });
    final result = await query.get();
    return result.map((row) => Category(
      id: row.id, 
      name: row.name, 
      businessMode: row.businessMode,
      syncId: row.syncId,
    )).toList();
  }

  @override
  Future<void> addCategory(String name, {String? businessMode}) async {
    final trimmed = name.trim();
    final mode = businessMode ?? 'retail';
    final now = DateTime.now();

    final existing = await (db.select(db.categories)
          ..where((t) => t.name.equals(trimmed)))
        .getSingleOrNull();

    if (existing != null) {
      if (existing.isDeleted) {
        // Soft-deleted names still occupy UNIQUE(categories.name).
        // Re-adding the same name restores that row instead of inserting again.
        await (db.update(db.categories)..where((t) => t.id.equals(existing.id))).write(
          CategoriesCompanion(
            isDeleted: const Value(false),
            businessMode: Value(mode),
            updatedAt: Value(now),
          ),
        );
        return;
      }
      throw Exception('Category "$trimmed" already exists.');
    }

    final deviceId = await DeviceInfoService.getDeviceSuffix();
    await db.into(db.categories).insert(CategoriesCompanion.insert(
      name: trimmed,
      businessMode: Value(mode),
      syncId: Value(_uuid.v4()),
      updatedAt: Value(now),
      createdAt: Value(now),
      deviceId: Value(deviceId),
      isDeleted: const Value(false),
    ));
  }

  @override
  Future<void> deleteCategory(int id) async {
    // Soft delete for sync
    await (db.update(db.categories)..where((tbl) => tbl.id.equals(id))).write(
      CategoriesCompanion(
        isDeleted: const Value(true),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }
}
