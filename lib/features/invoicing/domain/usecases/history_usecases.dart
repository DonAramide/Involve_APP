import '../../domain/entities/invoice.dart';
import '../../domain/repositories/invoice_repository.dart';

class GetInvoiceHistory {
  final InvoiceRepository repository;
  GetInvoiceHistory(this.repository);

  Future<List<Invoice>> call({DateTime? start, DateTime? end}) async {
    if (start != null && end != null) {
      return repository.getInvoicesByDateRange(start, end);
    }
    return repository.getAllInvoices();
  }
}

class GetInvoiceDetails {
  final InvoiceRepository repository;
  GetInvoiceDetails(this.repository);
  Future<Invoice?> call(int id) => repository.getInvoiceById(id);
}
