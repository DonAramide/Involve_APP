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

  static Future<int> getTrialDaysRemaining() async {
    final trialStart = await StorageService.getTrialStartDate();
    if (trialStart == null) return 0;
    
    final trialExpiry = trialStart.add(const Duration(days: 3));
    final remaining = trialExpiry.difference(DateTime.now()).inDays;
    return remaining < 0 ? 0 : remaining + 1; // +1 to include today
  }

  static Future<bool> isTrialValid() async {
    final trialStart = await StorageService.getTrialStartDate();
    if (trialStart == null) return false;
    
    final trialExpiry = trialStart.add(const Duration(days: 3));
    return DateTime.now().isBefore(trialExpiry);
  }

  static Future<bool> canAccess() async {
    // 1. Check for valid license
    if (await isActivated()) return true;
    
    // 2. Check for trial
    final trialStart = await StorageService.getTrialStartDate();
    if (trialStart == null) {
      // First run - initialize trial
      await StorageService.saveTrialStartDate(DateTime.now());
      return true; // Just started trial
    }
    
    return await isTrialValid();
  }
}
