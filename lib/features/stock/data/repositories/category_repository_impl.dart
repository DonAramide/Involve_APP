import 'package:drift/drift.dart';
import '../models/category_table.dart';
import '../../domain/entities/category.dart';
import '../../domain/repositories/category_repository.dart';
import '../datasources/app_database.dart';

class CategoryRepositoryImpl implements CategoryRepository {
  final AppDatabase db;

  CategoryRepositoryImpl(this.db);

  @override
  Future<List<Category>> getCategories() async {
    final query = db.select(db.categories);
    final result = await query.get();
    return result.map((row) => Category(id: row.id, name: row.name)).toList();
  }

  @override
  Future<void> addCategory(String name) async {
    await db.into(db.categories).insert(CategoriesCompanion(
      name: Value(name),
    ));
  }

  @override
  Future<void> deleteCategory(int id) async {
    await (db.delete(db.categories)..where((tbl) => tbl.id.equals(id))).go();
  }
}
