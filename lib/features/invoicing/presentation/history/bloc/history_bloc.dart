import 'package:flutter_bloc/flutter_bloc.dart';
import 'history_state.dart';
import '../../../domain/usecases/history_usecases.dart';
import '../../../domain/repositories/invoice_repository.dart';
import '../../../domain/entities/invoice.dart';
import '../../../data/repositories/invoice_repository_impl.dart';

class HistoryBloc extends Bloc<HistoryEvent, HistoryState> {
  final GetInvoiceHistory getHistory;
  final GetInvoiceDetails getInvoiceDetails;

  HistoryBloc({
    required this.getHistory,
    required this.getInvoiceDetails,
  }) : super(HistoryInitial()) {
    on<LoadHistory>(_onLoadHistory);
    on<RecordPayment>(_onRecordPayment);
  }

  Future<void> _onRecordPayment(RecordPayment event, Emitter<HistoryState> emit) async {
    try {
      final repo = getHistory.repository as InvoiceRepositoryImpl;
      await repo.recordPayment(event.invoiceId, event.additionalAmount, event.method);
      add(LoadHistory()); // Reload history after update
    } catch (e) {
      emit(HistoryError('Failed to update payment: ${e.toString()}'));
    }
  }

  Future<void> _onLoadHistory(LoadHistory event, Emitter<HistoryState> emit) async {
    emit(HistoryLoading());
    try {
      var invoices = await getHistory(start: event.start, end: event.end);
      
      // Apply filters
      if (event.query != null && event.query!.isNotEmpty) {
        final query = event.query!.toLowerCase();
        invoices = invoices.where((inv) => 
          inv.invoiceNumber.toLowerCase().contains(query) ||
          (inv.customerName?.toLowerCase().contains(query) ?? false)
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

      if (event.paymentStatus != null && event.paymentStatus != 'All') {
        final status = event.paymentStatus;
        if (status == 'Full Payment') {
          invoices = invoices.where((inv) => inv.paymentStatus == 'Paid').toList();
        } else if (status == 'Partial Payment') {
          invoices = invoices.where((inv) => inv.paymentStatus == 'Partial').toList();
        } else if (status == 'Unpaid') {
          invoices = invoices.where((inv) => inv.paymentStatus == 'Unpaid').toList();
        } else if (status == 'Outstanding') {
          invoices = invoices.where((inv) => inv.balanceAmount > 0).toList();
        }
      }

      if (event.staffId != null) {
        invoices = invoices.where((inv) => inv.staffId == event.staffId).toList();
      }
      
      final totalSales = invoices.fold<double>(0, (sum, inv) => sum + inv.amountPaid);

      emit(HistoryLoaded(
        invoices, 
        totalSales: totalSales, 
        query: event.query, 
        amount: event.amount,
        paymentMethod: event.paymentMethod,
        paymentStatus: event.paymentStatus,
        staffId: event.staffId,
      ));
    } catch (e) {
      emit(HistoryError('Failed to load history: ${e.toString()}'));
    }
  }
}
