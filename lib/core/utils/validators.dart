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

  /// Physical street address: 9+ characters, at least 2 letters, and at least
  /// two spaces (three words), e.g. "12 Adeola Street".
  static String? validateStreetAddress(String? value) {
    final address = (value ?? '').trim();
    if (address.isEmpty) {
      return 'Enter your street address';
    }
    if (address.length < 9) {
      return 'Address must be at least 9 characters';
    }
    final spaceCount = RegExp(r'\s').allMatches(address).length;
    if (spaceCount < 2) {
      return 'Enter a full street address (e.g. 12 Adeola Street)';
    }
    final letterCount = RegExp(r'[A-Za-z]').allMatches(address).length;
    if (letterCount < 2) {
      return 'Address must include at least 2 letters';
    }
    return null;
  }
}
