import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'history_state.dart';
import '../../../domain/usecases/history_usecases.dart';
import '../../../domain/entities/invoice.dart';
import '../../../domain/repositories/invoice_repository.dart';
import '../../../data/repositories/invoice_repository_impl.dart';
import 'package:involve_app/core/utils/sales_period_totals.dart';
import 'package:involve_app/core/utils/invoice_payment_rail.dart';
import 'package:involve_app/core/services/finance_api_client.dart';

class HistoryBloc extends Bloc<HistoryEvent, HistoryState> {
  final GetInvoiceHistory getHistory;
  final GetInvoiceDetails getInvoiceDetails;

  HistoryBloc({
    required this.getHistory,
    required this.getInvoiceDetails,
  }) : super(HistoryInitial()) {
    on<LoadHistory>(_onLoadHistory);
    on<RecordPayment>(_onRecordPayment);
    on<ReturnStock>(_onReturnStock);
  }

  Future<void> _onReturnStock(ReturnStock event, Emitter<HistoryState> emit) async {
    try {
      final repo = getHistory.repository;
      await repo.returnItems(
        invoiceId: event.invoiceId, 
        items: event.items.cast<ReturnItem>(), 
        staffId: event.staffId,
        replacements: event.replacements,
      );
      add(LoadHistory()); // Refresh list
    } catch (e) {
      emit(HistoryError('Failed to return items: ${e.toString()}'));
    }
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
      var invoices = await getHistory(
        start: event.start, 
        end: event.end,
        customerName: event.customerName,
      );

      // Heal unpaid prior bills already collected via "Previous Term Balance"
      // on a later invoice (Create Invoice path), then reload if anything changed.
      var healed = false;
      try {
        if (await getHistory.repository.healSettledPartialInvoices()) {
          healed = true;
        }
      } catch (_) {}
      final studentIds = invoices
          .where((inv) => inv.studentId != null)
          .map((inv) => inv.studentId!)
          .toSet();
      for (final studentId in studentIds) {
        final changed =
            await getHistory.repository.reconcileStudentCarryForwardSettlements(studentId);
        if (changed) healed = true;
      }
      if (healed) {
        invoices = await getHistory(
          start: event.start,
          end: event.end,
          customerName: event.customerName,
        );
      }
      
      // Apply filters
      if (event.query != null && event.query!.isNotEmpty) {
        final query = event.query!.toLowerCase();
        invoices = invoices.where((inv) => 
          inv.invoiceNumber.toLowerCase().contains(query) ||
          (inv.customerName?.toLowerCase().contains(query) ?? false) ||
          (inv.className?.toLowerCase().contains(query) ?? false)
        ).toList();
      }
      
      if (event.amount != null) {
        // Filter by approximate amount (within 1 unit) or exact
        invoices = invoices.where((inv) => 
          (inv.totalAmount - event.amount!).abs() < 1.0
        ).toList();
      }

      if (event.paymentMethod != null && event.paymentMethod != 'All') {
        invoices = invoices.where((inv) {
          if (event.paymentMethod == 'Wallet') {
            return classifyInvoicePaymentRail(inv.paymentMethod) ==
                InvoicePaymentRail.wallet;
          }
          return inv.paymentMethod == event.paymentMethod;
        }).toList();
      }

      if (event.paymentStatus != null && event.paymentStatus != 'All') {
        final status = event.paymentStatus;
        if (status == 'Full Payment') {
          invoices = invoices.where((inv) => inv.displayPaymentStatus == 'Paid').toList();
        } else if (status == 'Partial Payment') {
          invoices = invoices.where((inv) => inv.displayPaymentStatus == 'Partial').toList();
        } else if (status == 'Unpaid') {
          invoices = invoices.where((inv) => inv.displayPaymentStatus == 'Unpaid').toList();
        } else if (status == 'Outstanding') {
          invoices = invoices.where((inv) => inv.displayBalance > 0).toList();
        } else if (status == 'Pending') {
          invoices = invoices.where((inv) => inv.paymentStatus == 'Pending').toList();
        }
      }

      if (event.staffId != null) {
        invoices = invoices.where((inv) => inv.staffId == event.staffId).toList();
      }

      if (event.classId != null) {
        invoices = invoices.where((inv) => inv.classId == event.classId).toList();
      }
      
      var totals = salesPeriodTotals(invoices);
      var totalSales = totals.collected;
      var totalInvoiced = totals.invoiced;
      var totalPending = totals.pending;
      // Remote summary is tenant-wide for the date range only — skip when the
      // list is narrowed by search/staff/class/method so the header matches rows.
      final filtersActive = (event.query?.trim().isNotEmpty ?? false) ||
          event.amount != null ||
          (event.paymentMethod != null && event.paymentMethod != 'All') ||
          (event.paymentStatus != null && event.paymentStatus != 'All') ||
          event.staffId != null ||
          event.classId != null ||
          (event.customerName?.trim().isNotEmpty ?? false);
      try {
        if (!filtersActive && GetIt.instance.isRegistered<FinanceApiClient>()) {
          final client = GetIt.instance<FinanceApiClient>();
          final res = await client.get(
            '/api/v1/finance/invoices/collection-summary',
            queryParameters: {
              if (event.start != null) 'startDate': event.start!.toUtc().toIso8601String(),
              if (event.end != null) 'endDate': event.end!.toUtc().toIso8601String(),
            },
          );
          final data = res.data;
          if (data is Map) {
            // Cloud can lag behind local cash settlements. Never replace
            // on-device period totals with a weaker remote summary (zeros).
            final remoteInvoiced = (data['invoiced'] as num?)?.toDouble();
            final remoteCollected = (data['recordedCollected'] as num?)?.toDouble();
            if (remoteInvoiced != null && remoteInvoiced > totalInvoiced) {
              totalInvoiced = remoteInvoiced;
            }
            if (remoteCollected != null && remoteCollected > totalSales) {
              totalSales = remoteCollected;
            }
            totalPending = totalInvoiced - totalSales;
            if (totalPending < 0) totalPending = 0;
          }
        }
      } catch (_) {
        // Keep local period totals while offline.
      }

      emit(HistoryLoaded(
        invoices, 
        totalSales: totalSales,
        totalInvoiced: totalInvoiced,
        totalPending: totalPending,
        query: event.query, 
        amount: event.amount,
        paymentMethod: event.paymentMethod,
        paymentStatus: event.paymentStatus,
        staffId: event.staffId,
        classId: event.classId,
        customerName: event.customerName,
      ));
    } catch (e) {
      emit(HistoryError('Failed to load history: ${e.toString()}'));
    }
  }
}
