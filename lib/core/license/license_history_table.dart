import 'package:drift/drift.dart';

class LicenseHistory extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get licenseId => text()();
  TextColumn get businessName => text()();
  TextColumn get code => text()();
  TextColumn get plan => text()();
  DateTimeColumn get expiryDate => dateTime()();
  DateTimeColumn get createdAt => dateTime()();
  BoolColumn get isActivated => boolean().withDefault(const Constant(false))();
}
