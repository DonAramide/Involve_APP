import 'package:drift/drift.dart';
import '../../../stock/data/models/item_table.dart';

@DataClassName('InvoiceTable')
class Invoices extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get invoiceNumber => text()();
  DateTimeColumn get dateCreated => dateTime().withDefault(currentDateAndTime)();
  RealColumn get subtotal => real()();
  RealColumn get taxAmount => real()();
  RealColumn get discountAmount => real()();
  RealColumn get totalAmount => real()();
  TextColumn get paymentStatus => text()(); // e.g., 'Paid', 'Pending'
  TextColumn get customerName => text().nullable()();
  TextColumn get customerAddress => text().nullable()();
}

@DataClassName('InvoiceItemTable')
class InvoiceItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get invoiceId => integer().references(Invoices, #id)();
  IntColumn get itemId => integer().references(Items, #id)();
  IntColumn get quantity => integer()();
  RealColumn get unitPrice => real()();
}
