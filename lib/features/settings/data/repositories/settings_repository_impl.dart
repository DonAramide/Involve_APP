import 'package:drift/drift.dart';
import '../models/settings_table.dart';
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
        currency: 'NGN',
      );
    }
    return _toEntity(result);
  }

  @override
  Future<void> updateSettings(AppSettings settings) async {
    await db.into(db.settings).insertOnConflictUpdate(
          SettingsCompanion(
            id: const Value(1), // Singleton approach
            organizationName: Value(settings.organizationName),
            address: Value(settings.address),
            phone: Value(settings.phone),
            taxId: Value(settings.taxId),
            logoPath: Value(settings.logoPath),
            logo: Value(settings.logo),
            themeMode: Value(settings.themeMode),
            currency: Value(settings.currency),
            taxEnabled: Value(settings.taxEnabled),
            discountEnabled: Value(settings.discountEnabled),
            defaultInvoiceTemplate: Value(settings.defaultInvoiceTemplate),
            allowPriceUpdates: Value(settings.allowPriceUpdates),
            failedAttempts: Value(settings.failedAttempts),
            isLocked: Value(settings.isLocked),
            lockedAt: Value(settings.lockedAt),
          ),
        );
  }

  AppSettings _toEntity(SettingsTable row) {
    return AppSettings(
      id: row.id,
      organizationName: row.organizationName,
      address: row.address,
      phone: row.phone,
      taxId: row.taxId,
      logoPath: row.logoPath,
      logo: row.logo,
      themeMode: row.themeMode,
      currency: row.currency,
      taxEnabled: row.taxEnabled,
      discountEnabled: row.discountEnabled,
      defaultInvoiceTemplate: row.defaultInvoiceTemplate,
      allowPriceUpdates: row.allowPriceUpdates,
      failedAttempts: row.failedAttempts,
      isLocked: row.isLocked,
      lockedAt: row.lockedAt,
    );
  }
}
