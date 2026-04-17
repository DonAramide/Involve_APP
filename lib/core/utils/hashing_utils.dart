import 'dart:convert';
import 'package:crypto/crypto.dart';

class HashingUtils {
  /// Generates a deterministic SHA-256 hash for a lesson note based on its metadata.
  /// Standardizes input by trimming, lowercasing, and normalizing spacing to ensure consistency.
  static String generateContentHash({
    required String className,
    required String subjectName,
    required String term,
    required int week,
    required String topic,
  }) {
    String normalize(String value) {
      return value.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');
    }

    final input = [
      normalize(className),
      normalize(subjectName),
      normalize(term),
      week.toString(),
      normalize(topic),
    ].join('|');
    
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
