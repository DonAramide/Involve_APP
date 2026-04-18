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

  // Stock Management Use Cases
  final IncreaseStock increaseStock;
  final GetStockHistory getStockHistory;
  final GetInventoryReport getInventoryReport;
  final GetProfitReport getProfitReport;
  final AddExpense addExpenseUC;
  final GetExpenses getExpensesUC;
  final GetTotalExpenses getTotalExpensesUC;

  StockBloc({
    required this.getItems,
    required this.addItem,
    required this.updateItem,
    required this.deleteItem,
    required this.getCategories,
    required this.addCategory,
    required this.deleteCategory,
    required this.increaseStock,
    required this.getStockHistory,
    required this.getInventoryReport,
    required this.getProfitReport,
    required this.addExpenseUC,
    required this.getExpensesUC,
    required this.getTotalExpensesUC,
  }) : super(StockInitial()) {
    on<LoadItems>(_onLoadItems);
    on<AddStockItem>(_onAddStockItem);
    on<UpdateStockItem>(_onUpdateStockItem);
    on<DeleteStockItem>(_onDeleteStockItem);
    on<StockIncrementRequested>(_onStockIncrementRequested);
    on<LoadStockHistoryRequested>(_onLoadStockHistoryRequested);
    on<LoadInventoryReportRequested>(_onLoadInventoryReportRequested);
    on<LoadProfitReportRequested>(_onLoadProfitReportRequested);
    on<AddExpenseRequested>(_onAddExpenseRequested);
    on<LoadExpensesRequested>(_onLoadExpensesRequested);
    on<ResetStockStatus>((event, emit) {
      if (state is StockLoaded) {
        emit((state as StockLoaded).copyWith(status: StockStatus.initial, error: null));
      } else {
        emit(StockLoaded(state.items, categories: state.categories, businessMode: state.businessMode, status: StockStatus.initial));
      }
    });
    
    // Category Handlers
    on<LoadCategories>(_onLoadCategories);
    on<AddCategory>(_onAddCategory);
    on<DeleteCategory>(_onDeleteCategory);
    on<ToggleItemDefaultEvent>(_onToggleItemDefault);
  }

  Future<void> _onLoadItems(LoadItems event, Emitter<StockState> emit) async {
    emit(StockLoading(items: state.items, categories: state.categories));
    try {
      final items = await getItems(businessMode: event.businessMode);
      final categories = await getCategories(businessMode: event.businessMode);
      emit(StockLoaded(items, categories: categories, businessMode: event.businessMode));
    } catch (e) {
      emit(StockError('Failed to load data: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onAddStockItem(AddStockItem event, Emitter<StockState> emit) async {
    emit(StockLoading(items: state.items, categories: state.categories, businessMode: state.businessMode));
    try {
      await addItem(event.item);
      emit(StockLoaded(state.items, categories: state.categories, businessMode: state.businessMode, status: StockStatus.success));
      add(LoadItems(businessMode: state.businessMode));
    } catch (e) {
      emit(StockError('Failed to add item: ${e.toString()}', items: state.items, categories: state.categories, businessMode: state.businessMode));
    }
  }

  Future<void> _onUpdateStockItem(UpdateStockItem event, Emitter<StockState> emit) async {
    emit(StockLoading(items: state.items, categories: state.categories, businessMode: state.businessMode));
    try {
      await updateItem(event.item);
      emit(StockLoaded(state.items, categories: state.categories, businessMode: state.businessMode, status: StockStatus.success));
      add(LoadItems(businessMode: state.businessMode));
    } catch (e) {
      emit(StockError('Failed to update item: ${e.toString()}', items: state.items, categories: state.categories, businessMode: state.businessMode));
    }
  }

  Future<void> _onDeleteStockItem(DeleteStockItem event, Emitter<StockState> emit) async {
    try {
      await deleteItem(event.id);
      add(LoadItems(businessMode: state.businessMode));
    } catch (e) {
      emit(StockError('Failed to delete item: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onStockIncrementRequested(StockIncrementRequested event, Emitter<StockState> emit) async {
    try {
      await increaseStock(
        event.itemId,
        event.quantity,
        event.remarks,
        supplierName: event.supplierName,
        supplyInvoiceImage: event.supplyInvoiceImage,
      );
      add(LoadItems(businessMode: state.businessMode));
    } catch (e) {
      emit(StockError('Failed to increase stock: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onLoadStockHistoryRequested(LoadStockHistoryRequested event, Emitter<StockState> emit) async {
    emit(StockLoading(items: state.items, categories: state.categories));
    try {
      final history = await getStockHistory(event.itemId);
      emit(StockHistoryLoaded(history, items: state.items, categories: state.categories));
    } catch (e) {
      emit(StockError('Failed to load history: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onLoadInventoryReportRequested(LoadInventoryReportRequested event, Emitter<StockState> emit) async {
    emit(StockLoading(items: state.items, categories: state.categories));
    try {
      final report = await getInventoryReport(start: event.start, end: event.end, businessMode: event.businessMode);
      emit(InventoryReportLoaded(report, items: state.items, categories: state.categories));
    } catch (e) {
      emit(StockError('Failed to load report: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onLoadProfitReportRequested(LoadProfitReportRequested event, Emitter<StockState> emit) async {
    emit(StockLoading(items: state.items, categories: state.categories));
    try {
      final report = await getProfitReport(start: event.start, end: event.end, businessMode: event.businessMode);
      final totalExpenses = await getTotalExpensesUC(start: event.start, end: event.end, businessMode: event.businessMode);
      final expenses = await getExpensesUC(start: event.start, end: event.end, businessMode: event.businessMode);
      emit(ProfitReportLoaded(report, totalExpenses, expenses: expenses, items: state.items, categories: state.categories));
    } catch (e) {
      emit(StockError('Failed to load profit report: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onAddExpenseRequested(AddExpenseRequested event, Emitter<StockState> emit) async {
    try {
      await addExpenseUC(event.expense);
    } catch (e) {
      emit(StockError('Failed to log expense: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onLoadExpensesRequested(LoadExpensesRequested event, Emitter<StockState> emit) async {
    emit(StockLoading(items: state.items, categories: state.categories));
    try {
      final expenses = await getExpensesUC(start: event.start, end: event.end, businessMode: event.businessMode);
      emit(ExpensesLoaded(expenses, items: state.items, categories: state.categories));
    } catch (e) {
      emit(StockError('Failed to load expenses: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onLoadCategories(LoadCategories event, Emitter<StockState> emit) async {
    try {
      final categories = await getCategories(businessMode: event.businessMode);
      if (state is StockLoaded) {
        emit((state as StockLoaded).copyWith(categories: categories, businessMode: event.businessMode));
      } else {
        emit(StockLoaded(state.items, categories: categories, businessMode: event.businessMode));
      }
    } catch (e) {
      // Silent fail
    }
  }

  Future<void> _onAddCategory(AddCategory event, Emitter<StockState> emit) async {
    try {
      await addCategory(event.name, businessMode: event.businessMode);
      add(LoadCategories(businessMode: event.businessMode));
    } catch (e) {
      emit(StockError('Failed to add category: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onDeleteCategory(DeleteCategory event, Emitter<StockState> emit) async {
    try {
      await deleteCategory(event.id);
      add(LoadCategories(businessMode: state.businessMode));
    } catch (e) {
      emit(StockError('Failed to delete category: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }

  Future<void> _onToggleItemDefault(ToggleItemDefaultEvent event, Emitter<StockState> emit) async {
    try {
      final updatedItem = event.item.copyWith(isDefault: !event.item.isDefault);
      await updateItem(updatedItem);
      add(LoadItems(businessMode: state.businessMode));
    } catch (e) {
      emit(StockError('Failed to toggle default status: ${e.toString()}', items: state.items, categories: state.categories));
    }
  }
}
