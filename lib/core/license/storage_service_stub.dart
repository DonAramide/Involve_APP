import 'dart:async';

class StorageService {
  static Future<void> saveLicense(String licenseData) async {}
  static Future<String?> getLicense() async => null;
  static Future<void> saveLastOpenedDate(DateTime date) async {}
  static Future<DateTime?> getLastOpenedDate() async => null;
  static Future<void> saveTrialStartDate(DateTime date) async {}
  static Future<DateTime?> getTrialStartDate() async => null;
  static Future<void> setBusinessNameLocked(bool locked) async {}
  static Future<bool> isBusinessNameLocked() async => false;
  static Future<void> setBusinessModeLocked(bool locked) async {}
  static Future<bool> isBusinessModeLocked() async => false;
  static Future<void> saveLastPrinterIp(String ip) async {}
  static Future<String?> getLastPrinterIp() async => null;
  static Future<void> saveProExpiryDate(DateTime date) async {}
  static Future<DateTime?> getProExpiryDate() async => null;
  static Future<void> clearProExpiryDate() async {}
  static Future<void> saveServerActivatedPlan({
    required String planType,
    required DateTime expiryDate,
  }) async {}
  static Future<({String planType, DateTime expiryDate})?> getServerActivatedPlan() async => null;
  static Future<void> setDeviceAccessGranted(bool granted) async {}
  static Future<bool> isDeviceAccessGranted() async => false;
  static Future<void> setOnboardingCompleted(bool completed) async {}
  static Future<bool> isOnboardingCompleted() async => false;
  static Future<void> setOnlineSyncEnabled(bool enabled) async {}
  static Future<bool> isOnlineSyncEnabled() async => true;
  static Future<void> setOnlineInvoiceUpdateEnabled(bool enabled) async {}
  static Future<bool> isOnlineInvoiceUpdateEnabled() async => true;
}
