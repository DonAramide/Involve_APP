import 'package:flutter_bloc/flutter_bloc.dart';
import 'stock_state.dart';
import '../../domain/usecases/stock_usecases.dart';

class StockBloc extends Bloc<StockEvent, StockState> {
  final GetItems getItems;
  final AddItem addItem;
  final UpdateItem updateItem;
  final DeleteItem deleteItem;
  
  // Category Use Cases
  final GetCategories getCategories;
  final AddNewCategory addCategory;
  final DeleteCategoryUseCase deleteCategory;

  StockBloc({
    required this.getItems,
    required this.addItem,
    required this.updateItem,
    required this.deleteItem,
    required this.getCategories,
    required this.addCategory,
    required this.deleteCategory,
  }) : super(StockInitial()) {
    on<LoadItems>(_onLoadItems);
    on<AddStockItem>(_onAddStockItem);
    on<UpdateStockItem>(_onUpdateStockItem);
    on<DeleteStockItem>(_onDeleteStockItem);
    
    // Category Handlers
    on<LoadCategories>(_onLoadCategories);
    on<AddCategory>(_onAddCategory);
    on<DeleteCategory>(_onDeleteCategory);
  }

  Future<void> _onLoadItems(LoadItems event, Emitter<StockState> emit) async {
    emit(StockLoading());
    try {
      final items = await getItems();
      final categories = await getCategories(); // Load categories too
      emit(StockLoaded(items, categories: categories));
    } catch (e) {
      emit(StockError('Failed to load data: ${e.toString()}'));
    }
  }

  Future<void> _onAddStockItem(AddStockItem event, Emitter<StockState> emit) async {
    try {
      await addItem(event.item);
      add(LoadItems());
    } catch (e) {
      emit(StockError('Failed to add item: ${e.toString()}'));
    }
  }

  Future<void> _onUpdateStockItem(UpdateStockItem event, Emitter<StockState> emit) async {
    try {
      await updateItem(event.item);
      add(LoadItems());
    } catch (e) {
      emit(StockError('Failed to update item: ${e.toString()}'));
    }
  }

  Future<void> _onDeleteStockItem(DeleteStockItem event, Emitter<StockState> emit) async {
    try {
      await deleteItem(event.id);
      add(LoadItems());
    } catch (e) {
      emit(StockError('Failed to delete item: ${e.toString()}'));
    }
  }

  Future<void> _onLoadCategories(LoadCategories event, Emitter<StockState> emit) async {
    // Only reload categories if already loaded to avoid full screen loading flicker
    if (state is StockLoaded) {
      final currentItems = (state as StockLoaded).items;
      try {
        final categories = await getCategories();
        emit(StockLoaded(currentItems, categories: categories));
      } catch (e) {
        // Silent fail or snackbar? For now keep state
      }
    } else {
      add(LoadItems()); // Fallback to full load
    }
  }

  Future<void> _onAddCategory(AddCategory event, Emitter<StockState> emit) async {
    try {
      await addCategory(event.name);
      add(LoadCategories());
    } catch (e) {
      emit(StockError('Failed to add category: ${e.toString()}'));
    }
  }

  Future<void> _onDeleteCategory(DeleteCategory event, Emitter<StockState> emit) async {
    try {
      await deleteCategory(event.id);
      add(LoadCategories());
    } catch (e) {
      emit(StockError('Failed to delete category: ${e.toString()}'));
    }
  }
}
