import '../entities/category.dart';

abstract class CategoryRepository {
  Future<List<Category>> getCategories();
  Future<void> addCategory(String name);
  Future<void> deleteCategory(int id);
}
