import 'package:drift/drift.dart';

@DataClassName('StaffTable')
class Staff extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().withLength(min: 1, max: 100)();
  TextColumn get staffCode => text().withLength(min: 4, max: 4)(); // 4-character code
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}
