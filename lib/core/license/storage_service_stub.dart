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
  static Future<void> saveLastPrinterIp(String ip) async {}
  static Future<String?> getLastPrinterIp() async => null;
  static Future<void> saveProExpiryDate(DateTime date) async {}
  static Future<DateTime?> getProExpiryDate() async => null;
  static Future<void> setDeviceAccessGranted(bool granted) async {}
  static Future<bool> isDeviceAccessGranted() async => false;
}
