import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'binary_service.dart';
import 'base32_service.dart';
import 'license_model.dart';

class LicenseValidator {
  static const String _hmacSecret = "INVOLVE-SECURE-HMAC-SECRET-2024";

  /// Validates a formatted license key against a business name
  static LicenseModel? validate(String key, String businessName) {
    try {
      // 1. Normalize and Decode Base32
      final raw = Base32Service.normalize(key);
      final bytes = Base32Service.decode(raw);
      if (bytes.length != 15) return null;

      // 2. Split Payload (11) and Signature (4)
      final payload = bytes.sublist(0, 11);
      final providedSignature = bytes.sublist(11, 15);

      // 3. Verify Signature (Integrity)
      final hmac = Hmac(sha256, utf8.encode(_hmacSecret));
      final calculatedSignature = hmac.convert(payload).bytes.sublist(0, 4);

      for (int i = 0; i < 4; i++) {
        if (providedSignature[i] != calculatedSignature[i]) return null;
      }

      // 4. Unpack and Validate Payload
      final data = BinaryService.unpack(payload);

      // A. Business Name Hash Check
      final bizHash = BinaryService.generateBusinessHash(businessName);
      if (data['bizHash'] != bizHash) return null;

      // B. Expiry Check
      final expiryDate = DateTime.fromMillisecondsSinceEpoch(data['expiryTs'] * 1000);
      
      return LicenseModel(
        businessName: businessName,
        expiryDate: expiryDate,
        planType: PlanType.values[data['planIndex'] % PlanType.values.length],
        licenseId: data['licenseId'],
      );
    } catch (e) {
      return null;
    }
  }

  /// Decodes and returns license info without business name check (for Admin tool)
  static Map<String, dynamic>? peek(String key) {
    try {
      final raw = Base32Service.normalize(key);
      final bytes = Base32Service.decode(raw);
      if (bytes.length != 15) return null;

      final payload = bytes.sublist(0, 11);
      final signature = bytes.sublist(11, 15);
      
      // Still verify signature or peek would be misleading
      final hmac = Hmac(sha256, utf8.encode(_hmacSecret));
      final calculatedSignature = hmac.convert(payload).bytes.sublist(0, 4);
      for (int i = 0; i < 4; i++) {
        if (signature[i] != calculatedSignature[i]) return null;
      }

      final data = BinaryService.unpack(payload);
      return {
        ...data,
        'expiryDate': DateTime.fromMillisecondsSinceEpoch(data['expiryTs'] * 1000),
        'planType': PlanType.values[data['planIndex'] % PlanType.values.length],
      };
    } catch (e) {
      return null;
    }
  }
}
