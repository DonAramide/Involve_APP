import 'package:drift/drift.dart';
import '../models/settings_table.dart';
import '../../stock/data/datasources/app_database.dart';
import '../../settings/domain/entities/settings.dart';

abstract class SettingsRepository {
  Future<AppSettings> getSettings();
  Future<void> updateSettings(AppSettings settings);
}

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
            currency: Value(settings.currency),
            taxEnabled: Value(settings.taxEnabled),
            discountEnabled: Value(settings.discountEnabled),
            defaultInvoiceTemplate: Value(settings.defaultInvoiceTemplate),
            allowPriceUpdates: Value(settings.allowPriceUpdates),
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
      currency: row.currency,
      taxEnabled: row.taxEnabled,
      discountEnabled: row.discountEnabled,
      defaultInvoiceTemplate: row.defaultInvoiceTemplate,
      allowPriceUpdates: row.allowPriceUpdates,
    );
  }
}
