import 'package:involve_app/core/license/hmac_service.dart';
import 'package:involve_app/core/license/license_model.dart';
import 'package:involve_app/core/license/storage_service.dart';

class LicenseService {
  static Future<bool> activate(String businessName, String activationCode) async {
    try {
      final parts = activationCode.split('.');
      if (parts.length != 2) return false;

      final base64Json = parts[0];
      final signature = parts[1];

      // 1. Verify signature
      if (!HMACService.verifySignature(base64Json, signature)) {
        return false;
      }

      // 2. Decode license
      final license = LicenseModel.fromBase64Json(base64Json);

      // 3. Compare business name
      if (license.businessName.toLowerCase().trim() != businessName.toLowerCase().trim()) {
        return false;
      }

      // 4. Check expiry date
      if (DateTime.now().isAfter(license.expiryDate)) {
        return false;
      }

      // 5. Save license locally
      await StorageService.saveLicense(activationCode);
      
      // Update last opened date on activation
      await StorageService.saveLastOpenedDate(DateTime.now());

      return true;
    } catch (e) {
      return false;
    }
  }

  static Future<LicenseModel?> getActiveLicense() async {
    final code = await StorageService.getLicense();
    if (code == null) return null;

    final parts = code.split('.');
    if (parts.length != 2) return null;

    final base64Json = parts[0];
    final signature = parts[1];

    if (!HMACService.verifySignature(base64Json, signature)) {
      return null;
    }

    return LicenseModel.fromBase64Json(base64Json);
  }

  static Future<bool> isActivated() async {
    final license = await getActiveLicense();
    if (license == null) return false;
    
    // Check expiry
    if (DateTime.now().isAfter(license.expiryDate)) {
      return false;
    }

    // Date tamper protection
    final lastOpened = await StorageService.getLastOpenedDate();
    if (lastOpened != null) {
      if (DateTime.now().isBefore(lastOpened)) {
        return false; // Tampered
      }
    }
    
    // Update last opened date
    await StorageService.saveLastOpenedDate(DateTime.now());

    return true;
  }

  static Future<bool> isDateTampered() async {
    final lastOpened = await StorageService.getLastOpenedDate();
    if (lastOpened == null) return false;
    return DateTime.now().isBefore(lastOpened);
  }

  static Future<bool> isExpired() async {
    final license = await getActiveLicense();
    if (license == null) return false;
    return DateTime.now().isAfter(license.expiryDate);
  }
}
