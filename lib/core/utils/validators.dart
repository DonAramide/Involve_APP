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

  static String? validatePhone(String? value) {
    if (value == null || value.isEmpty) return 'Phone number required';
    if (!RegExp(r'^[0-9+\s-]{7,15}$').hasMatch(value)) {
      return 'Enter a valid phone number';
    }
    return null;
  }
}
