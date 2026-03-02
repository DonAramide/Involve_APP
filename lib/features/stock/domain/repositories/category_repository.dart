import '../entities/category.dart';

abstract class CategoryRepository {
  Future<List<Category>> getCategories({String? businessMode});
  Future<void> addCategory(String name, {String? businessMode});
  Future<void> deleteCategory(int id);
}
