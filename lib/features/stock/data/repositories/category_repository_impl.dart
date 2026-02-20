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
  Future<List<Category>> getCategories() async {
    final query = db.select(db.categories)..where((t) => t.isDeleted.equals(false));
    final result = await query.get();
    return result.map((row) => Category(id: row.id, name: row.name, syncId: row.syncId)).toList();
  }

  @override
  Future<void> addCategory(String name) async {
    final now = DateTime.now();
    final deviceId = await DeviceInfoService.getDeviceSuffix();
    
    await db.into(db.categories).insert(CategoriesCompanion.insert(
      name: name,
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
