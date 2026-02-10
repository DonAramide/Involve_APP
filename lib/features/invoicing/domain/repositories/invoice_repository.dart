import '../entities/invoice.dart';

abstract class InvoiceRepository {
  Future<void> saveInvoice(Invoice invoice);
  Future<List<Invoice>> getAllInvoices();
  Future<Invoice?> getInvoiceById(int id);
  Future<List<Invoice>> getInvoicesByDateRange(DateTime start, DateTime end);
}
