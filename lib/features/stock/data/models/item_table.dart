import 'package:drift/drift.dart';
import 'category_table.dart';

@DataClassName('ItemTable')
class Items extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().withLength(min: 1, max: 100)();
  TextColumn get category => text()(); // String representation of ItemCategory enum
  RealColumn get price => real()();
  IntColumn get stockQty => integer().withDefault(const Constant(0))();
  
  // Phase 2: New Columns
  BlobColumn get image => blob().nullable()();
  IntColumn get categoryId => integer().nullable().references(Categories, #id)(); // Optional FK
  
  // Phase 3: Service Billing
  TextColumn get type => text().withDefault(const Constant('product'))(); // 'product' or 'service'
  TextColumn get billingType => text().nullable()(); // 'fixed', 'per_day', 'per_hour'
  TextColumn get serviceCategory => text().nullable()(); // 'Hotel', 'Lounge', etc.
  BoolColumn get requiresTimeTracking => boolean().withDefault(const Constant(false))();

  // Sync Columns
  TextColumn get syncId => text().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().nullable()();
  TextColumn get deviceId => text().nullable()();
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();
}
