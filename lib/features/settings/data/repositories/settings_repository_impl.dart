import 'dart:convert';
import 'package:drift/drift.dart';
import '../../../stock/data/datasources/app_database.dart';
import '../../domain/entities/settings.dart';
import '../../domain/repositories/settings_repository.dart';

class SettingsRepositoryImpl implements SettingsRepository {
  final AppDatabase db;

  SettingsRepositoryImpl(this.db);

  @override
  Future<AppSettings> getSettings() async {
    final result = await db.select(db.settings).getSingleOrNull();
    if (result == null) {
      return const AppSettings(
        organizationName: 'My Business',
        address: '123 Street',
        phone: '000-000',
        currency: '₦',
      );
    }
    final entity = _toEntity(result);
    // Auto-normalize legacy currency
    if (entity.currency == 'NGN') {
      return entity.copyWith(currency: '₦');
    }
    return entity;
  }

  @override
  Future<void> updateSettings(AppSettings settings) async {
    final existing = await db.select(db.settings).getSingleOrNull();
    final companion = SettingsCompanion(
      id: const Value(1),
      organizationName: Value(settings.organizationName),
      address: Value(settings.address),
      phone: Value(settings.phone),
      businessDescription: Value(settings.businessDescription),
      taxId: Value(settings.taxId),
      logoPath: Value(settings.logoPath),
      logo: Value(settings.logo),
      themeMode: Value(settings.themeMode),
      currency: Value(settings.currency),
      taxEnabled: Value(settings.taxEnabled),
      discountEnabled: Value(settings.discountEnabled),
      defaultInvoiceTemplate: Value(settings.defaultInvoiceTemplate),
      allowPriceUpdates: Value(settings.allowPriceUpdates),
      confirmPriceOnSelection: Value(settings.confirmPriceOnSelection),
      taxRate: Value(settings.taxRate),
      bankName: Value(settings.bankName),
      accountNumber: Value(settings.accountNumber),
      accountName: Value(settings.accountName),
      showAccountDetails: Value(settings.showAccountDetails),
      failedAttempts: Value(settings.failedAttempts),
      isLocked: Value(settings.isLocked),
      lockedAt: Value(settings.lockedAt),
      receiptFooter: Value(settings.receiptFooter),
      showSignatureSpace: Value(settings.showSignatureSpace),
      paymentMethodsEnabled: Value(settings.paymentMethodsEnabled),
      primaryColor: Value(settings.primaryColor),
      showDateTime: Value(settings.showDateTime),
      serviceBillingEnabled: Value(settings.serviceBillingEnabled),
      serviceTypes: Value(jsonEncode(settings.serviceTypes)),
      staffManagementEnabled: Value(settings.staffManagementEnabled),
      paperWidth: Value(settings.paperWidth),
      halfDayStartHour: Value(settings.halfDayStartHour),
      halfDayEndHour: Value(settings.halfDayEndHour),
      showSyncStatus: Value(settings.showSyncStatus),
      customReceiptPricingEnabled: Value(settings.customReceiptPricingEnabled),
      showLogo: Value(settings.showLogo),
    );

    if (existing == null) {
      await db.into(db.settings).insert(companion);
    } else {
      await (db.update(db.settings)..where((t) => t.id.equals(1))).write(companion);
    }
  }

  AppSettings _toEntity(SettingsTable row) {
    List<String> serviceTypes = [];
    if (row.serviceTypes != null && row.serviceTypes!.isNotEmpty) {
      try {
        serviceTypes = (jsonDecode(row.serviceTypes!) as List).cast<String>();
      } catch (e) {
        // Handle decode error or fallback
        serviceTypes = [];
      }
    }

    return AppSettings(
      id: row.id,
      organizationName: row.organizationName,
      address: row.address,
      phone: row.phone,
      businessDescription: row.businessDescription,
      taxId: row.taxId,
      logoPath: row.logoPath,
      logo: row.logo,
      themeMode: row.themeMode,
      currency: row.currency,
      taxEnabled: row.taxEnabled,
      discountEnabled: row.discountEnabled,
      defaultInvoiceTemplate: row.defaultInvoiceTemplate,
      allowPriceUpdates: row.allowPriceUpdates,
      confirmPriceOnSelection: row.confirmPriceOnSelection,
      taxRate: row.taxRate,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      accountName: row.accountName,
      showAccountDetails: row.showAccountDetails,
      failedAttempts: row.failedAttempts,
      isLocked: row.isLocked,
      lockedAt: row.lockedAt,
      receiptFooter: row.receiptFooter,
      showSignatureSpace: row.showSignatureSpace,
      paymentMethodsEnabled: row.paymentMethodsEnabled,
      primaryColor: row.primaryColor,
      showDateTime: row.showDateTime,
      serviceBillingEnabled: row.serviceBillingEnabled,
      serviceTypes: serviceTypes,
      staffManagementEnabled: row.staffManagementEnabled,
      paperWidth: row.paperWidth,
      halfDayStartHour: row.halfDayStartHour,
      halfDayEndHour: row.halfDayEndHour,
      showSyncStatus: row.showSyncStatus,
      customReceiptPricingEnabled: row.customReceiptPricingEnabled,
      showLogo: row.showLogo,
    );
  }
}
