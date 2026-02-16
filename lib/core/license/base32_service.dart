import 'dart:typed_data';
import 'package:base32/base32.dart';

class Base32Service {
  /// Encodes bytes to a Base32 string without padding
  static String encode(Uint8List data) {
    return base32.encode(data).replaceAll('=', '');
  }

  /// Decodes a Base32 string back to bytes
  static Uint8List decode(String input) {
    // Add padding if necessary for the library
    String padded = input;
    while (padded.length % 8 != 0) {
      padded += '=';
    }
    return base32.decode(padded);
  }

  /// Formats a string into blocks of 4 (e.g., XXXX-XXXX-...)
  static String format(String raw) {
    final blocks = <String>[];
    for (int i = 0; i < raw.length; i += 4) {
      int end = (i + 4 < raw.length) ? i + 4 : raw.length;
      blocks.add(raw.substring(i, end));
    }
    return blocks.join('-');
  }

  /// Normalizes a key by removing dashes and whitespace
  static String normalize(String input) {
    return input.replaceAll('-', '').replaceAll(' ', '').toUpperCase();
  }
}
