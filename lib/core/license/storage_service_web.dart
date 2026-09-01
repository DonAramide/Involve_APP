import 'dart:async';
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  static const _secureStorage = FlutterSecureStorage();
  static const _licenseKey = 'app_license_data';
  static const _lastOpenedKey = 'last_opened_date';
  static const _trialStartKey = 'trial_start_date';
  static const _businessLockedKey = 'is_business_locked';
  static const _modeLockedKey = 'is_mode_locked';
  static const _lastPrinterIpKey = 'last_printer_ip';
  static const _proExpiryKey = 'pro_plan_expiry';
  static const _serverPlanKey = 'server_activated_plan';
  static const _deviceAccessKey = 'device_admin_access_granted';
  static const _onboardingCompleteKey = 'onboarding_complete';
  static const _onlineSyncEnabledKey = 'online_sync_enabled';
  static const _onlineInvoiceUpdateEnabledKey = 'online_invoice_update_enabled';

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

  static Future<void> setBusinessModeLocked(bool locked) async {
    await _secureStorage.write(key: _modeLockedKey, value: locked ? 'true' : 'false');
  }

  static Future<bool> isBusinessModeLocked() async {
    final val = await _secureStorage.read(key: _modeLockedKey);
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

  static Future<void> clearProExpiryDate() async {
    await _secureStorage.delete(key: _proExpiryKey);
  }

  static Future<void> saveServerActivatedPlan({
    required String planType,
    required DateTime expiryDate,
  }) async {
    await _secureStorage.write(
      key: _serverPlanKey,
      value: jsonEncode({
        'planType': planType,
        'expiry': expiryDate.toIso8601String(),
      }),
    );
  }

  static Future<({String planType, DateTime expiryDate})?> getServerActivatedPlan() async {
    final raw = await _secureStorage.read(key: _serverPlanKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw);
      if (map is! Map) return null;
      final planType = map['planType']?.toString();
      final expiry = DateTime.tryParse(map['expiry']?.toString() ?? '');
      if (planType == null || planType.isEmpty || expiry == null) return null;
      return (planType: planType, expiryDate: expiry);
    } catch (_) {
      return null;
    }
  }

  static Future<void> setDeviceAccessGranted(bool granted) async {
    await _secureStorage.write(key: _deviceAccessKey, value: granted ? 'true' : 'false');
  }

  static Future<bool> isDeviceAccessGranted() async {
    final val = await _secureStorage.read(key: _deviceAccessKey);
    return val == 'true';
  }

  static Future<void> setOnboardingCompleted(bool completed) async {
    await _secureStorage.write(key: _onboardingCompleteKey, value: completed ? 'true' : 'false');
  }

  static Future<bool> isOnboardingCompleted() async {
    final val = await _secureStorage.read(key: _onboardingCompleteKey);
    return val == 'true';
  }

  static Future<void> setOnlineSyncEnabled(bool enabled) async {
    await _secureStorage.write(key: _onlineSyncEnabledKey, value: enabled ? 'true' : 'false');
  }

  static Future<bool> isOnlineSyncEnabled() async {
    final val = await _secureStorage.read(key: _onlineSyncEnabledKey);
    return val != 'false'; // Default to true
  }

  static Future<void> setOnlineInvoiceUpdateEnabled(bool enabled) async {
    await _secureStorage.write(key: _onlineInvoiceUpdateEnabledKey, value: enabled ? 'true' : 'false');
  }

  static Future<bool> isOnlineInvoiceUpdateEnabled() async {
    final val = await _secureStorage.read(key: _onlineInvoiceUpdateEnabledKey);
    return val != 'false'; // Default to true
  }
}
