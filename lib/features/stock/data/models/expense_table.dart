import 'package:drift/drift.dart';

@DataClassName('ExpenseTable')
class Expenses extends Table {
  IntColumn get id => integer().autoIncrement()();
  RealColumn get amount => real()();
  TextColumn get description => text().withLength(min: 1, max: 255)();
  TextColumn get category => text().nullable()(); // e.g., 'Rent', 'Electricity', 'Salaries'
  DateTimeColumn get date => dateTime().withDefault(currentDateAndTime)();
  
  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}
