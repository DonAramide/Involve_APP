import 'package:drift/drift.dart';
import 'package:involve_app/features/stock/data/models/item_table.dart';

@DataClassName('InvoiceTable')
class Invoices extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get invoiceNumber => text()();
  DateTimeColumn get dateCreated => dateTime().withDefault(currentDateAndTime)();
  RealColumn get subtotal => real()();
  RealColumn get taxAmount => real()();
  RealColumn get discountAmount => real()();
  RealColumn get totalAmount => real()();
  TextColumn get paymentStatus => text()(); // e.g., 'Paid', 'Unpaid', 'Partial'
  RealColumn get amountPaid => real().withDefault(const Constant(0.0))();
  RealColumn get balanceAmount => real().withDefault(const Constant(0.0))();
  TextColumn get customerName => text().nullable()();
  TextColumn get customerAddress => text().nullable()();
  TextColumn get paymentMethod => text().nullable()(); // 'Cash', 'POS', 'Transfer'
  
  // Phase 4: Staff Management
  IntColumn get staffId => integer().nullable()();
  TextColumn get staffName => text().nullable()();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
  RealColumn get totalPrintAmount => real().nullable()();
}

@DataClassName('InvoiceItemTable')
class InvoiceItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get invoiceId => integer().references(Invoices, #id)();
  IntColumn get itemId => integer().references(Items, #id)();
  IntColumn get quantity => integer()();
  RealColumn get unitPrice => real()();
  
  // Phase 3: Service Billing
  TextColumn get type => text().withDefault(const Constant('product'))(); // 'product' or 'service'
  TextColumn get serviceMeta => text().nullable()(); // JSON snapshot: billingType, timeIn, timeOut, rate, etc.

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
  RealColumn get printPrice => real().nullable()();
  IntColumn get returnedQuantity => integer().withDefault(const Constant(0))();
  BoolColumn get isReplacement => boolean().withDefault(const Constant(false))();
}
