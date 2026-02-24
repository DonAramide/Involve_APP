import 'package:drift/drift.dart';
import 'package:involve_app/features/invoicing/data/models/invoice_table.dart';
import 'package:involve_app/features/stock/data/models/item_table.dart';
import 'package:involve_app/features/settings/data/models/staff_table.dart';

@DataClassName('StockReturnTable')
class StockReturns extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get invoiceId => integer().references(Invoices, #id)();
  IntColumn get itemId => integer().references(Items, #id)();
  IntColumn get quantity => integer()();
  RealColumn get amountReturned => real()(); // Total value of returned items
  IntColumn get staffId => integer().references(Staff, #id)();
  DateTimeColumn get dateReturned => dateTime().withDefault(currentDateAndTime)();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}
