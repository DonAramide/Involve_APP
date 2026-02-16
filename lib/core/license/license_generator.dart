import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'binary_service.dart';
import 'base32_service.dart';
import 'license_model.dart';

class LicenseGenerator {
  // Hardcoded keys for HMAC (In production, these should be obfuscated or varied)
  static const String _hmacSecret = "INVOLVE-SECURE-HMAC-SECRET-2024";

  /// Generates a 24-character Base32 license key
  static String generate(LicenseModel license) {
    // 1. Pack data into 11 bytes
    final payload = BinaryService.pack(license);

    // 2. Calculate HMAC-SHA256
    final hmac = Hmac(sha256, utf8.encode(_hmacSecret));
    final signature = hmac.convert(payload);

    // 3. Take first 4 bytes of HMAC signature (32-bit security)
    final truncatedSignature = Uint8List.fromList(signature.bytes.sublist(0, 4));

    // 4. Concatenate Payload + Signature (11 + 4 = 15 bytes)
    final finalBytes = Uint8List(15);
    finalBytes.setRange(0, 11, payload);
    finalBytes.setRange(11, 15, truncatedSignature);

    // 5. Encode to Base32 and format
    final rawKey = Base32Service.encode(finalBytes);
    
    // Safety check: Ensure exactly 24 chars
    if (rawKey.length != 24) {
      throw Exception("License key generation failed logic check: length is ${rawKey.length}");
    }

    return Base32Service.format(rawKey);
  }
}
