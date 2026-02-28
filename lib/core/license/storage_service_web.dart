import 'dart:async';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  static const _secureStorage = FlutterSecureStorage();
  static const _licenseKey = 'app_license_data';
  static const _lastOpenedKey = 'last_opened_date';
  static const _trialStartKey = 'trial_start_date';
  static const _businessLockedKey = 'is_business_locked';
  static const _lastPrinterIpKey = 'last_printer_ip';
  static const _proExpiryKey = 'pro_plan_expiry';
  static const _deviceAccessKey = 'device_admin_access_granted';

  static Future<void> saveLicense(String licenseData) async {
    await _secureStorage.write(key: _licenseKey, value: licenseData);
  }

  static Future<String?> getLicense() async {
    return await _secureStorage.read(key: _licenseKey);
  }

  static Future<void> saveLastOpenedDate(DateTime date) async {
    await _secureStorage.write(key: _lastOpenedKey, value: date.toIso8601String());
  }

  static Future<DateTime?> getLastOpenedDate() async {
    final str = await _secureStorage.read(key: _lastOpenedKey);
    return str != null ? DateTime.tryParse(str) : null;
  }

  static Future<void> saveTrialStartDate(DateTime date) async {
    await _secureStorage.write(key: _trialStartKey, value: date.toIso8601String());
  }

  static Future<DateTime?> getTrialStartDate() async {
    final str = await _secureStorage.read(key: _trialStartKey);
    return str != null ? DateTime.tryParse(str) : null;
  }

  static Future<void> setBusinessNameLocked(bool locked) async {
    await _secureStorage.write(key: _businessLockedKey, value: locked ? 'true' : 'false');
  }

  static Future<bool> isBusinessNameLocked() async {
    final val = await _secureStorage.read(key: _businessLockedKey);
    return val == 'true';
  }

  static Future<void> saveLastPrinterIp(String ip) async {
    await _secureStorage.write(key: _lastPrinterIpKey, value: ip);
  }

  static Future<String?> getLastPrinterIp() async {
    return await _secureStorage.read(key: _lastPrinterIpKey);
  }

  static Future<void> saveProExpiryDate(DateTime date) async {
    await _secureStorage.write(key: _proExpiryKey, value: date.toIso8601String());
  }

  static Future<DateTime?> getProExpiryDate() async {
    final str = await _secureStorage.read(key: _proExpiryKey);
    return str != null ? DateTime.tryParse(str) : null;
  }

  static Future<void> setDeviceAccessGranted(bool granted) async {
    await _secureStorage.write(key: _deviceAccessKey, value: granted ? 'true' : 'false');
  }

  static Future<bool> isDeviceAccessGranted() async {
    final val = await _secureStorage.read(key: _deviceAccessKey);
    return val == 'true';
  }
}
