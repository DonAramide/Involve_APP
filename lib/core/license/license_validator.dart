import 'dart:typed_data';
import 'binary_service.dart';
import 'base32_service.dart';
import 'license_model.dart';

/// Client-side license helpers.
///
/// IMPORTANT: This class must NOT embed HMAC signing secrets.
/// Cryptographic validation is performed by the Invify backend
/// (`POST /devices/validate`). Offline use trusts locally stored
/// activation metadata after a successful server validation.
class LicenseValidator {
  /// Decode payload fields without verifying a client-held secret.
  /// Signature integrity is enforced server-side at activation time.
  static LicenseModel? decodeTrustedLocal(String key, String businessName) {
    try {
      final raw = Base32Service.normalize(key);
      final bytes = Base32Service.decode(raw);
      if (bytes.length != 15) return null;

      final payload = bytes.sublist(0, 11);
      final data = BinaryService.unpack(payload);
      final bizHash = BinaryService.generateBusinessHash(businessName);
      if (data['bizHash'] != bizHash) return null;

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

  /// Legacy name — does not perform client-side HMAC verification.
  static LicenseModel? validate(String key, String businessName) {
    return decodeTrustedLocal(key, businessName);
  }

  static Map<String, dynamic>? peek(String key) {
    try {
      final raw = Base32Service.normalize(key);
      final bytes = Base32Service.decode(raw);
      if (bytes.length != 15) return null;
      final payload = bytes.sublist(0, 11);
      final data = BinaryService.unpack(payload);
      return {
        ...data,
        'expiryDate': DateTime.fromMillisecondsSinceEpoch(data['expiryTs'] * 1000),
        'planType': PlanType.values[data['planIndex'] % PlanType.values.length],
        'signatureTrusted': false,
        'note': 'Client peek is informational only; activate via server validation',
      };
    } catch (e) {
      return null;
    }
  }
}
