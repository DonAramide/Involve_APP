import 'package:drift/drift.dart';

@DataClassName('SettingsTable')
class Settings extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get organizationName => text().withLength(min: 1, max: 100)();
  TextColumn get address => text()();
  TextColumn get phone => text()();
  TextColumn get taxId => text().nullable()();
  TextColumn get logoPath => text().nullable()();
  BlobColumn get logo => blob().nullable()();
  TextColumn get themeMode => text().withDefault(const Constant('system'))();
  TextColumn get currency => text().withDefault(const Constant('NGN'))();
  BoolColumn get taxEnabled => boolean().withDefault(const Constant(true))();
  BoolColumn get discountEnabled => boolean().withDefault(const Constant(true))();
  TextColumn get defaultInvoiceTemplate => text().withDefault(const Constant('compact'))();
  BoolColumn get allowPriceUpdates => boolean().withDefault(const Constant(true))();
  
  // Security lockout columns
  IntColumn get failedAttempts => integer().withDefault(const Constant(0))();
  BoolColumn get isLocked => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lockedAt => dateTime().nullable()();
}
