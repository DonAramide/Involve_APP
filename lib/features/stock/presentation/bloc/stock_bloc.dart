import 'package:flutter_bloc/flutter_bloc.dart';
import 'stock_state.dart';
import '../../domain/usecases/stock_usecases.dart';

class StockBloc extends Bloc<StockEvent, StockState> {
  final GetItems getItems;
  final AddItem addItem;
  final UpdateItem updateItem;
  final DeleteItem deleteItem;

  StockBloc({
    required this.getItems,
    required this.addItem,
    required this.updateItem,
    required this.deleteItem,
  }) : super(StockInitial()) {
    on<LoadItems>(_onLoadItems);
    on<AddStockItem>(_onAddStockItem);
    on<UpdateStockItem>(_onUpdateStockItem);
    on<DeleteStockItem>(_onDeleteStockItem);
  }

  Future<void> _onLoadItems(LoadItems event, Emitter<StockState> emit) async {
    emit(StockLoading());
    try {
      final items = await getItems();
      emit(StockLoaded(items));
    } catch (e) {
      emit(StockError('Failed to load items: ${e.toString()}'));
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
}
