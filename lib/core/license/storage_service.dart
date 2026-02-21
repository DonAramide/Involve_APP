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
  static const _lastPrinterIpKey = 'last_printer_ip';
  static const _proExpiryKey = 'pro_plan_expiry';
  static const _deviceAccessKey = 'device_admin_access_granted';
  static const _licenseFileName = 'license.dat';

  // Desktop simple encryption key (could be improved)
  static const _encryptionKey = 0xAF;

  static Future<void> saveLicense(String licenseData) async {
    if (kIsWeb) {
      await _secureStorage.write(key: _licenseKey, value: licenseData);
      return;
    }

    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _licenseKey, value: licenseData);
    } else {
      final file = await _getDesktopLicenseFile();
      final encrypted = _encryptDecrypt(licenseData);
      await file.writeAsBytes(encrypted);
    }
  }

  static Future<String?> getLicense() async {
    if (kIsWeb) {
      return await _secureStorage.read(key: _licenseKey);
    }

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
    if (kIsWeb) {
       await _secureStorage.write(key: _lastOpenedKey, value: dateStr);
       return;
    }
    
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _lastOpenedKey, value: dateStr);
    } else {
      final prefsFile = await _getDesktopPrefsFile();
      await prefsFile.writeAsString(dateStr);
    }
  }

  static Future<DateTime?> getLastOpenedDate() async {
    String? dateStr;
    if (kIsWeb) {
      dateStr = await _secureStorage.read(key: _lastOpenedKey);
    } else if (Platform.isAndroid || Platform.isIOS) {
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
    if (kIsWeb) {
       await _secureStorage.write(key: _trialStartKey, value: dateStr);
       return;
    }
    
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _trialStartKey, value: dateStr);
    } else {
      final file = await _getDesktopFile('trial_start.dat');
      await file.writeAsString(dateStr);
    }
  }

  static Future<DateTime?> getTrialStartDate() async {
    String? dateStr;
    if (kIsWeb) {
      dateStr = await _secureStorage.read(key: _trialStartKey);
    } else if (Platform.isAndroid || Platform.isIOS) {
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
    if (kIsWeb) {
      await _secureStorage.write(key: _businessLockedKey, value: value);
      return;
    }
    
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _businessLockedKey, value: value);
    } else {
      final file = await _getDesktopBusinessLockFile();
      await file.writeAsString(value);
    }
  }

  static Future<bool> isBusinessNameLocked() async {
    String? value;
    if (kIsWeb) {
      value = await _secureStorage.read(key: _businessLockedKey);
    } else if (Platform.isAndroid || Platform.isIOS) {
      value = await _secureStorage.read(key: _businessLockedKey);
    } else {
      final file = await _getDesktopBusinessLockFile();
      if (await file.exists()) {
        value = await file.readAsString();
      }
    }
    return value == 'true';
  }

  static Future<void> saveLastPrinterIp(String ip) async {
    if (kIsWeb) {
      await _secureStorage.write(key: _lastPrinterIpKey, value: ip);
      return;
    }
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _lastPrinterIpKey, value: ip);
    } else {
      final file = await _getDesktopFile('printer_ip.dat');
      await file.writeAsString(ip);
    }
  }

  static Future<String?> getLastPrinterIp() async {
    if (kIsWeb) {
      return await _secureStorage.read(key: _lastPrinterIpKey);
    }
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

  static Future<void> saveProExpiryDate(DateTime date) async {
    final dateStr = date.toIso8601String();
    if (kIsWeb) {
      await _secureStorage.write(key: _proExpiryKey, value: dateStr);
      return;
    }
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _proExpiryKey, value: dateStr);
    } else {
      final file = await _getDesktopFile('pro_expiry.dat');
      await file.writeAsString(dateStr);
    }
  }

  static Future<DateTime?> getProExpiryDate() async {
    String? dateStr;
    if (kIsWeb) {
      dateStr = await _secureStorage.read(key: _proExpiryKey);
    } else if (Platform.isAndroid || Platform.isIOS) {
      dateStr = await _secureStorage.read(key: _proExpiryKey);
    } else {
      final file = await _getDesktopFile('pro_expiry.dat');
      if (await file.exists()) {
        dateStr = await file.readAsString();
      }
    }
    return dateStr != null ? DateTime.tryParse(dateStr) : null;
  }

  static Future<void> setDeviceAccessGranted(bool granted) async {
    final value = granted ? 'true' : 'false';
    if (kIsWeb) {
      await _secureStorage.write(key: _deviceAccessKey, value: value);
      return;
    }
    if (Platform.isAndroid || Platform.isIOS) {
      await _secureStorage.write(key: _deviceAccessKey, value: value);
    } else {
      final file = await _getDesktopFile('admin_access.dat');
      await file.writeAsString(value);
    }
  }

  static Future<bool> isDeviceAccessGranted() async {
    String? value;
    if (kIsWeb) {
      value = await _secureStorage.read(key: _deviceAccessKey);
    } else if (Platform.isAndroid || Platform.isIOS) {
      value = await _secureStorage.read(key: _deviceAccessKey);
    } else {
      final file = await _getDesktopFile('admin_access.dat');
      if (await file.exists()) {
        value = await file.readAsString();
      }
    }
    return value == 'true';
  }
}
