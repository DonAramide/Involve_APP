import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

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
  static const _licenseFileName = 'license.dat';
  static const _mposTerminalIdKey = 'mpos_terminal_id';
  static const _onlineSyncEnabledKey = 'online_sync_enabled';
  static const _onlineInvoiceUpdateEnabledKey = 'online_invoice_update_enabled';

  static const _encryptionKey = 0xAF;

  static Future<void> saveLicense(String licenseData) async {
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _licenseKey, value: licenseData);
    } else {
      final file = await _getDesktopLicenseFile();
      final encrypted = _encryptDecrypt(licenseData);
      await file.writeAsBytes(encrypted);
    }
  }

  static Future<String?> getLicense() async {
    if (Platform.isAndroid || Platform.isIOS) {
      return await _secureStorage.read(key: _licenseKey);
    } else {
      final file = await _getDesktopLicenseFile();
      if (await file.exists()) {
        final encrypted = await file.readAsBytes();
        return _encryptDecryptRaw(encrypted);
      }
    }
    return null;
  }

  static Future<void> saveLastOpenedDate(DateTime date) async {
    final dateStr = date.toIso8601String();
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _lastOpenedKey, value: dateStr);
    } else {
      final prefsFile = await _getDesktopPrefsFile();
      await prefsFile.writeAsString(dateStr);
    }
  }

  static Future<DateTime?> getLastOpenedDate() async {
    String? dateStr;
    if (Platform.isAndroid || Platform.isIOS) {
      dateStr = await _secureStorage.read(key: _lastOpenedKey);
    } else {
      final prefsFile = await _getDesktopPrefsFile();
      if (await prefsFile.exists()) {
        dateStr = await prefsFile.readAsString();
      }
    }
    return dateStr != null ? DateTime.tryParse(dateStr) : null;
  }

  static Future<void> saveTrialStartDate(DateTime date) async {
    final dateStr = date.toIso8601String();
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _trialStartKey, value: dateStr);
    } else {
      final file = await _getDesktopFile('trial_start.dat');
      await file.writeAsString(dateStr);
    }
  }

  static Future<DateTime?> getTrialStartDate() async {
    String? dateStr;
    if (Platform.isAndroid || Platform.isIOS) {
      dateStr = await _secureStorage.read(key: _trialStartKey);
    } else {
      final file = await _getDesktopFile('trial_start.dat');
      if (await file.exists()) {
        dateStr = await file.readAsString();
      }
    }
    return dateStr != null ? DateTime.tryParse(dateStr) : null;
  }

  static Future<void> setBusinessNameLocked(bool locked) async {
    final value = locked ? 'true' : 'false';
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _businessLockedKey, value: value);
    } else {
      final file = await _getDesktopBusinessLockFile();
      await file.writeAsString(value);
    }
  }

  static Future<bool> isBusinessNameLocked() async {
    String? value;
    if (Platform.isAndroid || Platform.isIOS) {
      value = await _secureStorage.read(key: _businessLockedKey);
    } else {
      final file = await _getDesktopBusinessLockFile();
      if (await file.exists()) {
        value = await file.readAsString();
      }
    }
    return value == 'true';
  }

  static Future<void> setBusinessModeLocked(bool locked) async {
    final value = locked ? 'true' : 'false';
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _modeLockedKey, value: value);
    } else {
      final file = await _getDesktopFile('mode_lock.dat');
      await file.writeAsString(value);
    }
  }

  static Future<bool> isBusinessModeLocked() async {
    String? value;
    if (Platform.isAndroid || Platform.isIOS) {
      value = await _secureStorage.read(key: _modeLockedKey);
    } else {
      final file = await _getDesktopFile('mode_lock.dat');
      if (await file.exists()) {
        value = await file.readAsString();
      }
    }
    return value == 'true';
  }

  static Future<void> saveLastPrinterIp(String ip) async {
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _lastPrinterIpKey, value: ip);
    } else {
      final file = await _getDesktopFile('printer_ip.dat');
      await file.writeAsString(ip);
    }
  }

  static Future<String?> getLastPrinterIp() async {
    if (Platform.isAndroid || Platform.isIOS) {
      return await _secureStorage.read(key: _lastPrinterIpKey);
    } else {
      final file = await _getDesktopFile('printer_ip.dat');
      if (await file.exists()) {
        return await file.readAsString();
      }
    }
    return null;
  }

  static Future<void> saveMposTerminalId(String terminalId) async {
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _mposTerminalIdKey, value: terminalId);
    } else {
      final file = await _getDesktopFile('mpos_terminal_id.dat');
      await file.writeAsString(terminalId);
    }
  }

  static Future<String?> getMposTerminalId() async {
    if (Platform.isAndroid || Platform.isIOS) {
      return await _secureStorage.read(key: _mposTerminalIdKey);
    } else {
      final file = await _getDesktopFile('mpos_terminal_id.dat');
      if (await file.exists()) {
        return await file.readAsString();
      }
    }
    return null;
  }

  static Future<void> saveProExpiryDate(DateTime date) async {
    final dateStr = date.toIso8601String();
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _proExpiryKey, value: dateStr);
    } else {
      final file = await _getDesktopFile('pro_expiry.dat');
      await file.writeAsString(dateStr);
    }
  }

  static Future<DateTime?> getProExpiryDate() async {
    String? dateStr;
    if (Platform.isAndroid || Platform.isIOS) {
      dateStr = await _secureStorage.read(key: _proExpiryKey);
    } else {
      final file = await _getDesktopFile('pro_expiry.dat');
      if (await file.exists()) {
        dateStr = await file.readAsString();
      }
    }
    return dateStr != null ? DateTime.tryParse(dateStr) : null;
  }

  static Future<void> clearProExpiryDate() async {
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.delete(key: _proExpiryKey);
    } else {
      final file = await _getDesktopFile('pro_expiry.dat');
      if (await file.exists()) {
        await file.delete();
      }
    }
  }

  /// Plan applied from POST /devices/validate (admin activation QR), not HMAC license.
  static Future<void> saveServerActivatedPlan({
    required String planType,
    required DateTime expiryDate,
  }) async {
    final payload = jsonEncode({
      'planType': planType,
      'expiry': expiryDate.toIso8601String(),
    });
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _serverPlanKey, value: payload);
    } else {
      final file = await _getDesktopFile('server_plan.dat');
      await file.writeAsString(payload);
    }
  }

  static Future<({String planType, DateTime expiryDate})?> getServerActivatedPlan() async {
    String? raw;
    if (Platform.isAndroid || Platform.isIOS) {
      raw = await _secureStorage.read(key: _serverPlanKey);
    } else {
      final file = await _getDesktopFile('server_plan.dat');
      if (await file.exists()) {
        raw = await file.readAsString();
      }
    }
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
    final value = granted ? 'true' : 'false';
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _deviceAccessKey, value: value);
    } else {
      final file = await _getDesktopFile('admin_access.dat');
      await file.writeAsString(value);
    }
  }

  static Future<bool> isDeviceAccessGranted() async {
    String? value;
    if (Platform.isAndroid || Platform.isIOS) {
      value = await _secureStorage.read(key: _deviceAccessKey);
    } else {
      final file = await _getDesktopFile('admin_access.dat');
      if (await file.exists()) {
        value = await file.readAsString();
      }
    }
    return value == 'true';
  }

  static Future<void> setOnboardingCompleted(bool completed) async {
    final value = completed ? 'true' : 'false';
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _onboardingCompleteKey, value: value);
    } else {
      final file = await _getDesktopFile('onboarding.dat');
      await file.writeAsString(value);
    }
  }

  static Future<bool> isOnboardingCompleted() async {
    String? value;
    if (Platform.isAndroid || Platform.isIOS) {
      value = await _secureStorage.read(key: _onboardingCompleteKey);
    } else {
      final file = await _getDesktopFile('onboarding.dat');
      if (await file.exists()) {
        value = await file.readAsString();
      }
    }
    return value == 'true';
  }

  static Future<void> setOnlineSyncEnabled(bool enabled) async {
    final value = enabled ? 'true' : 'false';
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _onlineSyncEnabledKey, value: value);
    } else {
      final file = await _getDesktopFile('online_sync.dat');
      await file.writeAsString(value);
    }
  }

  static Future<bool> isOnlineSyncEnabled() async {
    String? value;
    if (Platform.isAndroid || Platform.isIOS) {
      value = await _secureStorage.read(key: _onlineSyncEnabledKey);
    } else {
      final file = await _getDesktopFile('online_sync.dat');
      if (await file.exists()) {
        value = await file.readAsString();
      }
    }
    return value != 'false'; // Default to true
  }

  static Future<void> setOnlineInvoiceUpdateEnabled(bool enabled) async {
    final value = enabled ? 'true' : 'false';
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _onlineInvoiceUpdateEnabledKey, value: value);
    } else {
      final file = await _getDesktopFile('online_invoice_update.dat');
      await file.writeAsString(value);
    }
  }

  static Future<bool> isOnlineInvoiceUpdateEnabled() async {
    String? value;
    if (Platform.isAndroid || Platform.isIOS) {
      value = await _secureStorage.read(key: _onlineInvoiceUpdateEnabledKey);
    } else {
      final file = await _getDesktopFile('online_invoice_update.dat');
      if (await file.exists()) {
        value = await file.readAsString();
      }
    }
    return value != 'false'; // Default to true
  }

  static Future<File> _getDesktopFile(String fileName) async {
    final dir = await getApplicationSupportDirectory();
    return File(p.join(dir.path, fileName));
  }

  static Future<File> _getDesktopLicenseFile() async => _getDesktopFile(_licenseFileName);
  static Future<File> _getDesktopPrefsFile() async => _getDesktopFile('prefs.dat');
  static Future<File> _getDesktopBusinessLockFile() async => _getDesktopFile('lock.dat');

  static List<int> _encryptDecrypt(String data) {
    final bytes = utf8.encode(data);
    return bytes.map((b) => b ^ _encryptionKey).toList();
  }

  static String _encryptDecryptRaw(List<int> bytes) {
    final decrypted = bytes.map((b) => b ^ _encryptionKey).toList();
    return utf8.decode(decrypted);
  }
}
