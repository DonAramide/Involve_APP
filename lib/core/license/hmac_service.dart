import 'dart:convert';
import 'package:crypto/crypto.dart';

class HMACService {
  static const String _secretKey = "INVOLVE_APP_SECRET_KEY_2026"; // Hardcoded secret key

  static String generateSignature(String data) {
    final key = utf8.encode(_secretKey);
    final bytes = utf8.encode(data);
    final hmacSha256 = Hmac(sha256, key);
    final digest = hmacSha256.convert(bytes);
    return digest.toString();
  }

  static bool verifySignature(String data, String signature) {
    final expectedSignature = generateSignature(data);
    return expectedSignature == signature;
  }
}
