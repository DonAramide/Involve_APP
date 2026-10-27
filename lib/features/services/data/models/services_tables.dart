import 'package:drift/drift.dart';

@DataClassName('CustomerTable')
class Customers extends Table {
  TextColumn get id => text()(); // UUID generated locally
  TextColumn get name => text()();
  TextColumn get phone => text().nullable()();
  TextColumn get email => text().nullable()();
  TextColumn get address => text().nullable()();
  BlobColumn get image => blob().nullable()();
  
  RealColumn get balance => real().withDefault(const Constant(0.0))();
  TextColumn get virtualAccountNumber => text().nullable()();
  TextColumn get virtualAccountName => text().nullable()();
  TextColumn get virtualAccountBank => text().nullable()();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))(); // pending, synced, syncing, failed

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('ServiceJobTable')
class ServiceJobs extends Table {
  TextColumn get id => text()(); // UUID generated locally
  TextColumn get jobId => text().unique()(); // INV-SRV-DEV-0001
  TextColumn get customerId => text().references(Customers, #id)();
  TextColumn get title => text()();
  TextColumn get description => text().nullable()();
  RealColumn get totalAmount => real()();
  RealColumn get amountPaid => real().withDefault(const Constant(0.0))();
  RealColumn get laborAmount => real().withDefault(const Constant(0.0))();
  RealColumn get balance => real()();
  TextColumn get status => text().withDefault(const Constant('pending'))(); // pending, in_progress, ready, delivered
  DateTimeColumn get dueDate => dateTime().nullable()();
  BlobColumn get image => blob().nullable()();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();
  TextColumn get warrantyDuration => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('ServicePaymentTable')
class ServicePayments extends Table {
  TextColumn get id => text()(); // UUID generated locally
  TextColumn get jobId => text().references(ServiceJobs, #id)();
  RealColumn get amount => real()();
  TextColumn get method => text()(); // Cash, Transfer, etc.
  TextColumn get reference => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  TextColumn get syncStatus => text().withDefault(const Constant('pending'))();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('ServiceJobPresetTable')
class ServiceJobPresets extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();

  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

@DataClassName('LocalCounterTable')
class LocalCounters extends Table {
  TextColumn get type => text()(); // e.g. 'INV-SRV'
  IntColumn get lastValue => integer().withDefault(const Constant(0))();

  @override
  Set<Column> get primaryKey => {type};
}

@DataClassName('ServiceMaterialTable')
class ServiceMaterials extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get category => text()(); // Categories requested by user
  TextColumn get name => text().unique()();
  RealColumn get defaultPrice => real()();
  BlobColumn get image => blob().nullable()();
}

@DataClassName('ServiceJobItemTable')
class ServiceJobItems extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get jobId => text().references(ServiceJobs, #id)();
  TextColumn get name => text()();
  TextColumn get category => text().nullable()();
  RealColumn get price => real()();
  RealColumn get quantity => real()();
}

@DataClassName('ServiceMaterialCategoryTable')
class ServiceMaterialCategories extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

@DataClassName('ServiceLaborPresetTable')
class ServiceLaborPresets extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  RealColumn get amount => real()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

@DataClassName('ServiceExpenseCategoryTable')
class ServiceExpenseCategories extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

@DataClassName('ServiceDescriptionFormatCategoryTable')
class ServiceDescriptionFormatCategories extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().unique()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

@DataClassName('ServiceDescriptionFormatFieldTable')
class ServiceDescriptionFormatFields extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get categoryId =>
      integer().references(ServiceDescriptionFormatCategories, #id)();
  TextColumn get name => text()();
  TextColumn get fieldType => text().withDefault(const Constant('text'))();
  IntColumn get sortOrder => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}
