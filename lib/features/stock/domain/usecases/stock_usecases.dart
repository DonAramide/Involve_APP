import '../entities/item.dart';
import '../repositories/item_repository.dart';
import '../entities/category.dart';
import '../repositories/category_repository.dart';

class GetItems {
  final ItemRepository repository;
  GetItems(this.repository);
  Future<List<Item>> call() => repository.getAllItems();
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

// Category Use Cases
class GetCategories {
  final CategoryRepository repository;
  GetCategories(this.repository);
  Future<List<Category>> call() => repository.getCategories();
}

class AddNewCategory {
  final CategoryRepository repository;
  AddNewCategory(this.repository);
  Future<void> call(String name) => repository.addCategory(name);
}

class DeleteCategoryUseCase {
  final CategoryRepository repository;
  DeleteCategoryUseCase(this.repository);
  Future<void> call(int id) => repository.deleteCategory(id);
}
