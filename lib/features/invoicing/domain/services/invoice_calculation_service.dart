import '../../../../core/utils/currency_formatter.dart';
import '../entities/invoice.dart';

class InvoiceCalculationService {
  double calculateSubtotal(List<InvoiceItem> items) {
    return CurrencyFormatter.roundMoney(items.fold(0.0, (sum, item) => sum + item.total));
  }

  double calculateTax(double subtotal, double taxRate, bool taxEnabled) {
    if (!taxEnabled) return 0.0;
    return CurrencyFormatter.roundMoney(subtotal * taxRate);
  }

  double calculateDiscountAmount(double subtotal, double tax, double discount, DiscountType type) {
    if (type == DiscountType.percentage) {
      return CurrencyFormatter.roundMoney((subtotal + tax) * (discount / 100));
    }
    return CurrencyFormatter.roundMoney(discount);
  }

  double calculateTotal(double subtotal, double tax, double discount, DiscountType type) {
    final discountAmount = calculateDiscountAmount(subtotal, tax, discount, type);
    return CurrencyFormatter.roundMoney((subtotal + tax) - discountAmount);
  }

  double calculateTotalPrintAmount(List<InvoiceItem> items, double taxRate, bool taxEnabled, double discount, DiscountType type) {
    final subtotal = CurrencyFormatter.roundMoney(items.fold(0.0, (sum, item) => sum + (item.quantity * (item.printPrice ?? item.unitPrice))));
    final tax = calculateTax(subtotal, taxRate, taxEnabled);
    final discountAmount = calculateDiscountAmount(subtotal, tax, discount, type);
    return CurrencyFormatter.roundMoney((subtotal + tax) - discountAmount);
  }

  String generateInvoiceNumber() {
    final now = DateTime.now();
    return 'INV-${now.year}${now.month}${now.day}-${now.millisecond}';
  }
}
