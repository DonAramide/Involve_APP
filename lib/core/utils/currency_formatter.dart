import 'package:intl/intl.dart';

class CurrencyFormatter {
  static final _formatter = NumberFormat("#,##0.00", "en_US");

  /// Formats a double amount into a string with thousands separators 
  /// and exactly two decimal places (e.g., 1,234.56).
  static String format(double amount) {
    return _formatter.format(amount);
  }

  /// Convenience method to format with a currency symbol.
  static String formatWithSymbol(double amount, {String symbol = '₦'}) {
    return '$symbol${format(amount)}';
  }
}
