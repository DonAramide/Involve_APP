import 'package:flutter/services.dart';

/// Shared 13-digit cap for every phone number field in the app.
class PhoneNumberInput {
  static const int maxDigits = 13;

  static final List<TextInputFormatter> formatters = [
    _PhoneDigitLimitFormatter(),
  ];

  static int digitCount(String? value) =>
      (value ?? '').replaceAll(RegExp(r'\D'), '').length;

  /// Trims an existing value down to [maxDigits] digits (keeps a leading +).
  static String clamp(String? value) {
    final text = value ?? '';
    final buf = StringBuffer();
    var digits = 0;
    for (final rune in text.runes) {
      final c = String.fromCharCode(rune);
      if (c == '+' && buf.isEmpty) {
        buf.write(c);
        continue;
      }
      if (RegExp(r'\d').hasMatch(c)) {
        if (digits >= maxDigits) continue;
        buf.write(c);
        digits++;
      }
    }
    return buf.toString();
  }

  static String? validate(
    String? value, {
    bool required = false,
    int minDigits = 0,
  }) {
    final digits = (value ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) {
      return required ? 'Phone number is required' : null;
    }
    if (digits.length > maxDigits) {
      return 'Phone number cannot exceed $maxDigits digits';
    }
    if (minDigits > 0 && digits.length < minDigits) {
      return 'Phone must be at least $minDigits digits';
    }
    return null;
  }
}

class _PhoneDigitLimitFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final formatted = PhoneNumberInput.clamp(newValue.text);
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
