import 'package:drift/drift.dart';

@DataClassName('SettingsTable')
class Settings extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get organizationName => text().withLength(min: 1, max: 100)();
  TextColumn get address => text()();
  TextColumn get phone => text()();
  TextColumn get businessDescription => text().nullable()();
  TextColumn get taxId => text().nullable()();
  TextColumn get logoPath => text().nullable()();
  BlobColumn get logo => blob().nullable()();
  TextColumn get themeMode => text().withDefault(const Constant('system'))();
  TextColumn get currency => text().withDefault(const Constant('NGN'))();
  BoolColumn get taxEnabled => boolean().withDefault(const Constant(true))();
  BoolColumn get discountEnabled => boolean().withDefault(const Constant(true))();
  TextColumn get defaultInvoiceTemplate => text().withDefault(const Constant('compact'))();
  BoolColumn get allowPriceUpdates => boolean().withDefault(const Constant(true))();
  BoolColumn get confirmPriceOnSelection => boolean().withDefault(const Constant(false))();
  RealColumn get taxRate => real().withDefault(const Constant(0.15))();
  
  // Account Details
  TextColumn get bankName => text().nullable()();
  TextColumn get accountNumber => text().nullable()();
  TextColumn get accountName => text().nullable()();
  BoolColumn get showAccountDetails => boolean().withDefault(const Constant(false))();
  TextColumn get receiptFooter => text().withDefault(const Constant('Thank you!'))();
  BoolColumn get showSignatureSpace => boolean().withDefault(const Constant(false))();
  BoolColumn get paymentMethodsEnabled => boolean().withDefault(const Constant(false))();
  IntColumn get primaryColor => integer().withDefault(const Constant(0xFF2196F3))(); // Colors.blue.value
  
  // Security lockout columns
  IntColumn get failedAttempts => integer().withDefault(const Constant(0))();
  BoolColumn get isLocked => boolean().withDefault(const Constant(false))();
  DateTimeColumn get lockedAt => dateTime().nullable()();
  
  // Display Options
  BoolColumn get showDateTime => boolean().withDefault(const Constant(true))();
  
  // Phase 3: Service Billing
  BoolColumn get serviceBillingEnabled => boolean().withDefault(const Constant(false))();
  TextColumn get serviceTypes => text().nullable()(); // JSON list of service categories
}
