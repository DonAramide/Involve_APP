import '../entities/invoice.dart';

class InvoiceCalculationService {
  static const double taxRate = 0.15; // Example 15% tax

  double calculateSubtotal(List<InvoiceItem> items) {
    return items.fold(0, (sum, item) => sum + item.total);
  }

  double calculateTax(double subtotal) {
    return subtotal * taxRate;
  }

  double calculateTotal(double subtotal, double tax, double discount) {
    return (subtotal + tax) - discount;
  }

  String generateInvoiceNumber() {
    final now = DateTime.now();
    return 'INV-${now.year}${now.month}${now.day}-${now.millisecond}';
  }
}
