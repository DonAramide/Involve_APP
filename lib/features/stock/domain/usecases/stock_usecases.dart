import '../entities/item.dart';
import '../repositories/item_repository.dart';

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
