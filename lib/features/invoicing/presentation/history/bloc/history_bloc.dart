import 'package:flutter_bloc/flutter_bloc.dart';
import 'history_state.dart';
import '../../../domain/usecases/history_usecases.dart';

class HistoryBloc extends Bloc<HistoryEvent, HistoryState> {
  final GetInvoiceHistory getHistory;
  final GetInvoiceDetails getInvoiceDetails;

  HistoryBloc({
    required this.getHistory,
    required this.getInvoiceDetails,
  }) : super(HistoryInitial()) {
    on<LoadHistory>(_onLoadHistory);
  }

  Future<void> _onLoadHistory(LoadHistory event, Emitter<HistoryState> emit) async {
    emit(HistoryLoading());
    try {
      var invoices = await getHistory(start: event.start, end: event.end);
      
      // Apply filters
      if (event.query != null && event.query!.isNotEmpty) {
        invoices = invoices.where((inv) => 
          inv.invoiceNumber.toLowerCase().contains(event.query!.toLowerCase())
        ).toList();
      }
      
      if (event.amount != null) {
        // Filter by approximate amount (within 1 unit) or exact
        invoices = invoices.where((inv) => 
          (inv.totalAmount - event.amount!).abs() < 1.0
        ).toList();
      }

      if (event.paymentMethod != null && event.paymentMethod != 'All') {
        invoices = invoices.where((inv) => inv.paymentMethod == event.paymentMethod).toList();
      }
      
      final totalSales = invoices.fold<double>(0, (sum, inv) => sum + inv.totalAmount);

      emit(HistoryLoaded(
        invoices, 
        totalSales: totalSales, 
        query: event.query, 
        amount: event.amount,
        paymentMethod: event.paymentMethod,
      ));
    } catch (e) {
      emit(HistoryError('Failed to load history: ${e.toString()}'));
    }
  }
}
