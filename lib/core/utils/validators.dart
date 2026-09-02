import 'phone_number_input.dart';

class InputValidator {
  static String? validateNotEmpty(String? value, String fieldName) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName cannot be empty';
    }
    return null;
  }

  static String? validateNumber(String? value, String fieldName, {bool allowDecimal = true}) {
    if (value == null || value.isEmpty) {
      return '$fieldName is required';
    }
    final number = allowDecimal ? double.tryParse(value) : int.tryParse(value);
    if (number == null) {
      return 'Please enter a valid number for $fieldName';
    }
    if (number < 0) {
      return '$fieldName cannot be negative';
    }
    return null;
  }

  static String? validatePhone(String? value, {bool required = true}) {
    return PhoneNumberInput.validate(value, required: required, minDigits: required ? 7 : 0);
  }
}
