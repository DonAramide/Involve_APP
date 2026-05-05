import '../entities/invoice.dart';
import '../entities/stock_return.dart';

abstract class InvoiceRepository {
  Future<void> saveInvoice(Invoice invoice);
  Future<void> updateInvoice(Invoice invoice);
  Future<List<Invoice>> getAllInvoices();
  Future<Invoice?> getInvoiceById(int id);
  Future<List<Invoice>> getInvoicesByDateRange(DateTime start, DateTime end);
  Future<bool> checkServiceAvailability(int itemId, DateTime start, DateTime end);
  Future<void> updatePaymentInfo(int invoiceId, String method, String status);
  Future<List<Invoice>> getInvoicesByStudentId(int studentId);
  Future<List<String>> getAllCustomerNames();
  Future<List<Invoice>> getInvoicesByCustomerName(String customerName, {DateTime? start, DateTime? end});
  
  // Stock Returns & Replacements
  Future<void> returnItems({
    required int invoiceId,
    required List<ReturnItem> items, // Items being returned or replaced
    required int staffId,
    List<InvoiceItem>? replacements, // New items being added as replacements
  });
  Future<List<StockReturn>> getStockReturnsByDateRange(DateTime start, DateTime end);
  Future<List<StockReturn>> getStockReturnsByInvoiceId(int invoiceId);
  
  Future<Map<String, dynamic>> initiateVirtualAccount({
    required double amount,
    String? customerName,
    String? customerPhone,
    String? email,
  });
}

class ReturnItem {
  final int itemId;
  final int quantity;
  final double amount;

  ReturnItem({required this.itemId, required this.quantity, required this.amount});
}
