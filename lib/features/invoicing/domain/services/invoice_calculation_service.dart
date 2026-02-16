import '../entities/invoice.dart';

class InvoiceCalculationService {
  double calculateSubtotal(List<InvoiceItem> items) {
    return items.fold(0, (sum, item) => sum + item.total);
  }

  double calculateTax(double subtotal, double taxRate, bool taxEnabled) {
    if (!taxEnabled) return 0.0;
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
