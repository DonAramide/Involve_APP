class NumberToWords {
  static final List<String> _ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];

  static final List<String> _tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  static final List<String> _thousands = ['', 'Thousand', 'Million', 'Billion'];

  static String convert(double amount, {String currency = 'Naira', String subunit = 'Kobo'}) {
    if (amount == 0) return 'Zero $currency Only';

    int wholePart = amount.floor();
    int decimalPart = ((amount - wholePart) * 100).round();

    String result = _convertWhole(wholePart);
    if (result.isNotEmpty) {
      result = '$result $currency';
    }

    if (decimalPart > 0) {
      String decimalWords = _convertWhole(decimalPart);
      if (result.isNotEmpty) {
        result = '$result and $decimalWords $subunit';
      } else {
        result = '$decimalWords $subunit';
      }
    }

    return '$result Only'.trim();
  }

  static String _convertWhole(int number) {
    if (number == 0) return '';
    
    String result = '';
    int i = 0;

    while (number > 0) {
      if (number % 1000 != 0) {
        result = '${_convertThreeDigits(number % 1000)} ${_thousands[i]} $result';
      }
      number ~/= 1000;
      i++;
    }

    return result.trim().replaceAll(RegExp(r'\s+'), ' ');
  }

  static String _convertThreeDigits(int n) {
    String res = '';
    if (n >= 100) {
      res = '${_ones[n ~/ 100]} Hundred';
      n %= 100;
      if (n > 0) res = '$res and ';
    }

    if (n >= 20) {
      res = '$res ${_tens[n ~/ 10]}';
      n %= 10;
      if (n > 0) res = '$res-${_ones[n]}';
    } else if (n > 0) {
      res = '$res ${_ones[n]}';
    }

    return res.trim();
  }
}
