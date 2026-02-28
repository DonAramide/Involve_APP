import 'package:involve_app/core/license/license_model.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/features/stock/data/datasources/app_database.dart';
import 'package:drift/drift.dart';
import 'package:involve_app/core/license/license_validator.dart';
import 'package:involve_app/core/license/license_generator.dart';
import 'package:involve_app/core/utils/device_info_service.dart';
import 'package:flutter/foundation.dart';

class LicenseService {
  static AppDatabase? _db;

  static void init(AppDatabase db) {
    _db = db;
  }

  static Future<LicenseModel?> activate(String businessName, String activationCode) async {
    try {
      // 1. Validate key and integrity
      final license = LicenseValidator.validate(activationCode, businessName);
      if (license == null) return null;

      // 2. Check expiry date
      if (DateTime.now().isAfter(license.expiryDate)) return null;

      // 3. Check Device ID Binding
      final currentDeviceSuffix = await DeviceInfoService.getDeviceSuffix();
      final expectedHash = DeviceInfoService.encodeSuffix(currentDeviceSuffix);
      
      // The licenseId in the license model actually holds the encoded device suffix hash
      if (license.licenseId != expectedHash) {
        debugPrint('Device Mismatch: License locked to hash ${license.licenseId}, but device is $expectedHash ($currentDeviceSuffix)');
        return null; 
      }

      // 4. Save license locally
      await StorageService.saveLicense(activationCode);
      
      // 5. Update last opened date on activation
      await StorageService.saveLastOpenedDate(DateTime.now());

      // 6. Lock business name to this license
      await StorageService.setBusinessNameLocked(true);

      // 7. Save to local history as activated
      await saveLicenseRecord(license, activationCode, isActivated: true);

      return license;
    } catch (e) {
      debugPrint('Activation Error: $e');
      return null;
    }
  }

  static Future<LicenseModel?> getActiveLicense(String? businessName) async {
    final code = await StorageService.getLicense();
    if (code == null || businessName == null) return null;

    return LicenseValidator.validate(code, businessName);
  }

  static Future<bool> isActivated(String? currentBusinessName) async {
    // 1. Check for Manual/Direct Pro status
    final proExpiry = await StorageService.getProExpiryDate();
    if (proExpiry != null && DateTime.now().isBefore(proExpiry)) {
      return true;
    }

    // 2. Check for Lifetime status
    final isLifetime = await StorageService.isBusinessNameLocked(); // Simplistic check for now, can be improved
    // Note: isDeviceAuthorized is better for lifetime, but it's in SecurityService

    // 3. Check for Activation Code License
    final license = await getActiveLicense(currentBusinessName);
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

  static Future<bool> isExpired(String? currentBusinessName) async {
    final license = await getActiveLicense(currentBusinessName);
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

  static Future<bool> canAccess(String? currentBusinessName) async {
    // 1. Check for valid license
    if (await isActivated(currentBusinessName)) return true;
    
    // 2. Check for trial
    final trialStart = await StorageService.getTrialStartDate();
    if (trialStart == null) {
      // First run - initialize trial
      await StorageService.saveTrialStartDate(DateTime.now());
      return true; // Just started trial
    }
    
    return await isTrialValid();
  }

  static Future<void> saveLicenseRecord(LicenseModel license, String code, {bool isActivated = false}) async {
    if (_db == null) return;
    
    await _db!.into(_db!.licenseHistory).insert(
      LicenseHistoryCompanion.insert(
        licenseId: license.licenseId.toString(),
        businessName: license.businessName,
        code: code,
        plan: license.planType.name,
        expiryDate: license.expiryDate,
        createdAt: DateTime.now(),
        isActivated: Value(isActivated),
      ),
    );
  }

  static Future<List<LicenseHistoryData>> getGeneratedLicenses() async {
    if (_db == null) return [];
    return await (_db!.select(_db!.licenseHistory)
      ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)]))
      .get();
  }

  static Future<List<LicenseHistoryData>> getActivationHistory() async {
    if (_db == null) return [];
    return await (_db!.select(_db!.licenseHistory)
      ..where((t) => t.isActivated.equals(true))
      ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)]))
      .get();
  }

  static LicenseModel? validateAndParseCode(String activationCode, String businessName) {
    return LicenseValidator.validate(activationCode, businessName);
  }

  /// Special peek for Admin tools that don't know the business name yet
  static Map<String, dynamic>? peekCode(String activationCode) {
    return LicenseValidator.peek(activationCode);
  }
}
